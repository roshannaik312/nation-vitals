import argparse
from pathlib import Path
from typing import List, Optional

import pandas as pd


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Merge EPA AQI data (county or ZIP) with health outcomes to enable "
            "comparative analysis."
        )
    )
    parser.add_argument(
        "--aqi-file",
        default="data/daily_aqi_by_county.csv",
        help="Path to EPA AQI dataset (daily records with Date + AQI columns).",
    )
    parser.add_argument(
        "--geo-level",
        choices=["county", "zip"],
        default="county",
        help="Geographic granularity to aggregate AQI data.",
    )
    parser.add_argument(
        "--drug-file",
        default="data/drug_deaths_2018_2023.csv",
        help="County-level drug overdose mortality file (CDC WONDER export).",
    )
    parser.add_argument(
        "--suicide-file",
        default="data/suicide_county_year.csv",
        help="County-level suicide mortality file.",
    )
    parser.add_argument(
        "--extra-health-file",
        default=None,
        help=(
            "Optional health-outcomes CSV already keyed by FIPS/ZIP + Year. "
            "Useful for providing ZIP-level outcomes."
        ),
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Where to write the merged comparison table (CSV).",
    )
    return parser.parse_args()


def ensure_exists(path_str: str) -> Path:
    path = Path(path_str)
    if not path.exists():
        raise FileNotFoundError(f"Required file not found: {path}")
    return path


def normalize_year(series: pd.Series) -> pd.Series:
    year = pd.to_numeric(series, errors="coerce").astype("Int64")
    return year


def detect_geo_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    for col in candidates:
        if col in df.columns:
            return col
    return None


def normalize_geo_id(df: pd.DataFrame, geo_level: str) -> pd.Series:
    if geo_level == "county":
        fips_col = detect_geo_column(df, ["fips", "FIPS", "CountyFIPS", "County Code"])
        if fips_col:
            return (
                pd.to_numeric(df[fips_col], errors="coerce")
                .astype("Int64")
                .astype(str)
                .str.zfill(5)
            )

        state_col = detect_geo_column(df, ["State Code", "state", "StateCode"])
        county_col = detect_geo_column(df, ["County Code", "county", "CountyCode"])
        if state_col and county_col:
            state = (
                pd.to_numeric(df[state_col], errors="coerce")
                .astype("Int64")
                .astype(str)
                .str.zfill(2)
            )
            county = (
                pd.to_numeric(df[county_col], errors="coerce")
                .astype("Int64")
                .astype(str)
                .str.zfill(3)
            )
            return state + county

        raise ValueError(
            "Could not detect county identifiers. Expected columns such as "
            "'fips' or 'State Code' + 'County Code'."
        )

    zip_col = detect_geo_column(
        df, ["zip", "ZIP", "Zip", "zip_code", "Zip Code", "ZIP Code"]
    )
    if not zip_col:
        raise ValueError("Could not detect ZIP code column in AQI data.")
    return (
        pd.to_numeric(df[zip_col], errors="coerce")
        .astype("Int64")
        .astype(str)
        .str.zfill(5)
    )


def load_aqi_summary(aqi_path: Path, geo_level: str) -> pd.DataFrame:
    print(f"\n1. Loading AQI data from {aqi_path} ...")
    df = pd.read_csv(aqi_path)
    if df.empty:
        raise ValueError("AQI dataset is empty.")

    df["geo_id"] = normalize_geo_id(df, geo_level)

    if "Year" in df.columns:
        df["Year"] = normalize_year(df["Year"])
    elif "Date" in df.columns:
        df["Year"] = pd.to_datetime(df["Date"], errors="coerce").dt.year.astype("Int64")
    else:
        raise ValueError("AQI dataset must include either 'Year' or 'Date' column.")

    year_mask = df["Year"].notna()
    if not year_mask.any():
        raise ValueError("No valid year information in AQI dataset.")
    df = df[year_mask]

    aqi_col = detect_geo_column(
        df,
        [
            "AQI",
            "AQI Value",
            "AQIValue",
            "Daily AQI Value",
            "DailyAQIValue",
        ],
    )
    if not aqi_col:
        raise ValueError("AQI dataset must contain an 'AQI' column.")

    df["AQI_VALUE"] = pd.to_numeric(df[aqi_col], errors="coerce")
    df = df[df["AQI_VALUE"].notna()]
    if df.empty:
        raise ValueError("No numeric AQI readings after cleaning.")

    category_col = detect_geo_column(
        df, ["Category", "AQI Category", "AQICategory", "AQI_Category"]
    )
    if category_col:
        df["_cat_good"] = df[category_col].str.contains("Good", case=False, na=False)
        df["_cat_moderate"] = df[category_col].str.contains(
            "Moderate", case=False, na=False
        )
        df["_cat_unhealthy"] = df[category_col].str.contains(
            "Unhealthy", case=False, na=False
        )
    else:
        df["_cat_good"] = False
        df["_cat_moderate"] = False
        df["_cat_unhealthy"] = False

    group_cols = ["geo_id", "Year"]
    summary = (
        df.groupby(group_cols)
        .agg(
            AvgAQI=("AQI_VALUE", "mean"),
            MedianAQI=("AQI_VALUE", "median"),
            MaxAQI=("AQI_VALUE", "max"),
            AQIObservations=("AQI_VALUE", "size"),
            GoodDays=("_cat_good", "sum"),
            ModerateDays=("_cat_moderate", "sum"),
            UnhealthyDays=("_cat_unhealthy", "sum"),
        )
        .reset_index()
    )

    summary["PctGoodDays"] = (
        summary["GoodDays"] / summary["AQIObservations"]
    ).round(3)
    summary["PctUnhealthyDays"] = (
        summary["UnhealthyDays"] / summary["AQIObservations"]
    ).round(3)

    geo_label = "fips" if geo_level == "county" else "zip"
    summary = summary.rename(columns={"geo_id": geo_label})

    print(
        f"   ✓ Aggregated AQI readings for {summary[geo_label].nunique()} "
        f"{geo_level}s spanning {summary['Year'].nunique()} years."
    )
    return summary


def load_drug_deaths(drug_path: Path, geo_level: str) -> pd.DataFrame:
    if geo_level != "county":
        print("   ↷ Skipping drug deaths file (county-level only).")
        return pd.DataFrame()

    print(f"\n2. Loading drug overdose data from {drug_path} ...")
    df = pd.read_csv(drug_path)
    df = df[df["County Code"].notna()].copy()
    df["fips"] = (
        pd.to_numeric(df["County Code"], errors="coerce")
        .astype("Int64")
        .astype(str)
        .str.zfill(5)
    )
    df["Year"] = normalize_year(df["Year"])

    df["DrugDeaths"] = pd.to_numeric(df["Deaths"], errors="coerce")
    df["DrugDeathRate"] = pd.to_numeric(df["Crude Rate"], errors="coerce")
    health = (
        df.groupby(["fips", "Year"])
        .agg(
            DrugDeaths=("DrugDeaths", "sum"),
            DrugDeathRate=("DrugDeathRate", "mean"),
        )
        .reset_index()
    )

    print(
        f"   ✓ Prepared drug outcomes for {health['fips'].nunique()} counties "
        f"and {health['Year'].nunique()} years."
    )
    return health


def load_suicide_data(suicide_path: Path, geo_level: str) -> pd.DataFrame:
    if geo_level != "county":
        print("   ↷ Skipping suicide file (county-level only).")
        return pd.DataFrame()

    if not suicide_path.exists():
        print("   ↷ Suicide data file not found; skipping.")
        return pd.DataFrame()

    print(f"\n3. Loading suicide mortality data from {suicide_path} ...")
    df = pd.read_csv(suicide_path)
    fips_col = detect_geo_column(df, ["FIPS", "fips"])
    if not fips_col:
        print("   ↷ No FIPS column detected in suicide file; skipping.")
        return pd.DataFrame()

    df["fips"] = df[fips_col].astype(str).str.zfill(5)
    df["Year"] = normalize_year(df["Year"])
    df["SuicideDeaths"] = pd.to_numeric(df.get("Deaths"), errors="coerce")
    df["SuicidePopulation"] = pd.to_numeric(df.get("Population"), errors="coerce")
    df["SuicideAgeAdjustedRate"] = pd.to_numeric(
        df.get("AgeAdjustedRate"), errors="coerce"
    )

    health = (
        df.groupby(["fips", "Year"])
        .agg(
            SuicideDeaths=("SuicideDeaths", "sum"),
            SuicidePopulation=("SuicidePopulation", "sum"),
            SuicideAgeAdjustedRate=("SuicideAgeAdjustedRate", "mean"),
        )
        .reset_index()
    )
    print(
        f"   ✓ Prepared suicide outcomes for {health['fips'].nunique()} counties."
    )
    return health


def load_extra_health(extra_path: Optional[str], geo_level: str) -> pd.DataFrame:
    if not extra_path:
        return pd.DataFrame()

    path = ensure_exists(extra_path)
    print(f"\n4. Loading custom health outcomes from {path} ...")
    df = pd.read_csv(path)
    if "Year" not in df.columns:
        raise ValueError("Custom health dataset must include a 'Year' column.")
    df["Year"] = normalize_year(df["Year"])

    geo_col = (
        detect_geo_column(df, ["fips", "FIPS", "CountyFIPS"])
        if geo_level == "county"
        else detect_geo_column(df, ["zip", "ZIP", "Zip Code", "zip_code"])
    )
    if not geo_col:
        raise ValueError(
            f"Custom health dataset missing {'FIPS' if geo_level == 'county' else 'ZIP'} column."
        )

    geo_label = "fips" if geo_level == "county" else "zip"
    df[geo_label] = df[geo_col].astype(str).str.zfill(5)

    numeric_cols = [
        col
        for col in df.columns
        if col not in {geo_col, "Year", geo_label}
        and pd.api.types.is_numeric_dtype(df[col])
    ]
    if not numeric_cols:
        raise ValueError("Custom health dataset must include numeric outcome columns.")

    agg_spec = {col: "mean" for col in numeric_cols}
    aggregated = (
        df.groupby([geo_label, "Year"])
        .agg(agg_spec)
        .reset_index()
    )
    print(
        f"   ✓ Loaded custom health metrics ({', '.join(numeric_cols)}) "
        f"for {aggregated[geo_label].nunique()} locations."
    )
    return aggregated


def merge_all_data(
    aqi_df: pd.DataFrame,
    health_frames: List[pd.DataFrame],
    geo_level: str,
) -> pd.DataFrame:
    geo_label = "fips" if geo_level == "county" else "zip"
    merged = aqi_df.copy()

    for frame in health_frames:
        if frame.empty:
            continue
        merged = merged.merge(frame, on=[geo_label, "Year"], how="left")

    print(
        f"\n✓ Combined AQI + health outcomes: {len(merged)} "
        f"rows covering {merged[geo_label].nunique()} {geo_level}s."
    )
    return merged


def compute_quick_correlations(merged: pd.DataFrame, geo_level: str) -> None:
    aqi_metrics = ["AvgAQI", "MedianAQI", "MaxAQI"]
    health_metrics = [
        col
        for col in merged.columns
        if col not in {"Year", "fips", "zip"}
        and any(keyword in col for keyword in ["Rate", "Deaths"])
    ]

    print("\nCorrelation snapshot (AQI vs health outcomes):")
    found = False
    for aqi_col in aqi_metrics:
        if aqi_col not in merged.columns:
            continue
        for health_col in health_metrics:
            subset = merged[[aqi_col, health_col]].dropna()
            if len(subset) < 25:
                continue
            corr = subset.corr().iloc[0, 1]
            print(
                f"   {aqi_col} vs {health_col}: "
                f"{corr:.3f} (n={len(subset)})"
            )
            found = True
    if not found:
        print("   Not enough overlapping data to compute correlations.")


def merge_aqi_with_health(args: argparse.Namespace) -> None:
    aqi_path = ensure_exists(args.aqi_file)
    health_frames: List[pd.DataFrame] = []

    aqi_df = load_aqi_summary(aqi_path, args.geo_level)
    drug_df = load_drug_deaths(Path(args.drug_file), args.geo_level)
    if not drug_df.empty:
        health_frames.append(drug_df)

    suicide_df = load_suicide_data(Path(args.suicide_file), args.geo_level)
    if not suicide_df.empty:
        health_frames.append(suicide_df)

    extra_df = load_extra_health(args.extra_health_file, args.geo_level)
    if not extra_df.empty:
        health_frames.append(extra_df)

    merged = merge_all_data(aqi_df, health_frames, args.geo_level)
    compute_quick_correlations(merged, args.geo_level)

    output_path = (
        Path(args.output)
        if args.output
        else Path(f"aqi_health_by_{args.geo_level}.csv")
    )
    merged.to_csv(output_path, index=False)
    print(f"\n✓ Saved merged comparison table to {output_path.resolve()}")


def merge_socioeconomic_data():
    """
    Retained entry point for backward compatibility, now producing AQI-health merges.
    """
    args = parse_args()
    merge_aqi_with_health(args)


if __name__ == "__main__":
    merge_socioeconomic_data()
