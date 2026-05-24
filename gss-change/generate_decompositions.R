#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(data.table)
  library(gssr)
  library(jsonlite)
  library(labelled)
  library(socialchange)
})

`%||%` <- function(x, y) {
  if (is.null(x) || length(x) == 0 || all(is.na(x))) y else x
}

repo_root <- normalizePath(getwd(), mustWork = TRUE)
if (!file.exists(file.path(repo_root, "config.yaml"))) {
  script_path <- normalizePath(sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE)[1]), mustWork = FALSE)
  repo_root <- normalizePath(file.path(dirname(script_path), ".."), mustWork = FALSE)
}

parse_args <- function(args) {
  out <- list(
    limit = 100L,
    output = file.path(repo_root, "static", "gss-change", "data", "decompositions.json")
  )
  for (arg in args) {
    if (grepl("^--limit=", arg)) {
      out$limit <- as.integer(sub("^--limit=", "", arg))
    }
    if (grepl("^--output=", arg)) {
      out$output <- sub("^--output=", "", arg)
    }
  }
  out
}

title_case <- function(x) {
  x <- gsub("\\s+", " ", trimws(tolower(x)))
  tools::toTitleCase(x)
}

clean_label <- function(x) {
  x <- gsub("\\br\\b", "respondent", x, ignore.case = TRUE)
  x <- gsub("\\bgovt\\b", "government", x, ignore.case = TRUE)
  x <- gsub("\\bconfid\\.?\\b", "confidence", x, ignore.case = TRUE)
  x <- gsub("\\bnations\\b", "nation's", x, ignore.case = TRUE)
  x <- gsub("\\s+", " ", trimws(x))
  title_case(x)
}

stratum_label <- function(x) {
  x <- gsub("_", " / ", x, fixed = TRUE)
  x <- gsub("\\s+", " ", trimws(x))
  title_case(x)
}

safe_id <- function(x) {
  x <- tolower(x)
  x <- gsub("[^a-z0-9]+", "-", x)
  gsub("(^-|-$)", "", x)
}

round_number <- function(x, digits = 4) {
  if (length(x) == 0 || is.null(x) || is.na(x) || !is.finite(x)) {
    return(NULL)
  }
  round(as.numeric(x), digits)
}

round_vector <- function(x, digits = 4) {
  out <- round(as.numeric(x), digits)
  out[!is.finite(out)] <- NA_real_
  out
}

value_label <- function(x, value) {
  labels <- labelled::val_labels(x)
  labels <- labels[!is.na(labels)]
  if (!length(labels)) {
    return(as.character(value))
  }
  matched <- names(labels)[as.numeric(labels) == as.numeric(value)]
  clean_label(matched[1] %||% as.character(value))
}

candidate_variables <- function(gss, weight_var, limit_pool = 240L) {
  excluded_vars <- c(
    "year", "id", "age", "cohort", "sex", "race",
    "wtss", "wtssnr", "wtssall", "wtssps", "wtssnrps",
    "wtssps_nea", "wtssnrps_nea", "wtssps_next", "wtssnrps_next",
    "vpsu", "vstrat", "ballot", "sampcode", "sample", "form", "mode", "phase"
  )
  bad_pattern <- paste(c(
    "respondent", "interview", "ballot", "version", "weight", "sample",
    "form ", "form$", "mode", "phase", "case", "record", "serial",
    "id ", "id$", "date", "time", "supervisor", "interviewer", "length",
    "spanish", "language", "release", "vstrat", "vpsu", "norc size",
    "region of residence", "raceacs", "born in", "family income",
    "condition of health", "highest year of school", "highest degree",
    "marital status", "labor force", "number of", "babies born",
    "children ever", "partners", "age when", "household", "how many",
    "living with", "place lived", "geographic mobility", "src beltcode",
    "religious tradition", "ethnicity", "understanding of questions",
    "self-emp", "works for somebody", "_7222", "visitor", "relationship",
    "gender of", "coding", "verbatim", "specific denomination",
    "denomination", "telephone", "structure", "vital status", "spouse",
    "subordinate", "does r or spouse hunt", "word [a-z]$"
  ), collapse = "|")

  vars <- setdiff(names(gss), excluded_vars)
  stats <- rbindlist(lapply(vars, function(variable) {
    x <- gss[[variable]]
    if (!is.numeric(x)) {
      return(NULL)
    }
    ok <- !is.na(x) & !is.na(gss[["age"]]) & !is.na(gss[[weight_var]]) & gss[[weight_var]] > 0
    values <- as.numeric(x[ok])
    if (length(values) < 2000) {
      return(NULL)
    }
    unique_values <- sort(unique(values))
    if (length(unique_values) < 2 || length(unique_values) > 12) {
      return(NULL)
    }
    years <- sort(unique(as.integer(gss[["year"]][ok])))
    if (length(years) < 8) {
      return(NULL)
    }
    label <- labelled::var_label(x) %||% variable
    data.table(
      variable = variable,
      label = as.character(label),
      n = length(values),
      n_unique = length(unique_values),
      min_value = min(unique_values),
      max_value = max(unique_values),
      first_year = min(years),
      last_year = max(years),
      n_years = length(years),
      span = max(years) - min(years)
    )
  }), fill = TRUE)

  stats <- stats[
    span >= 20 &
      first_year <= 1995 &
      last_year >= 2010 &
      !grepl(bad_pattern, label, ignore.case = TRUE) &
      !grepl(bad_pattern, variable, ignore.case = TRUE)
  ]

  setorder(stats, -n_years, -n, variable)
  stats[seq_len(min(nrow(stats), limit_pool))]
}

build_input <- function(gss, variable, min_value, max_value, weight_var, mode, stratum_value = NULL) {
  x <- as.numeric(gss[[variable]])
  ok <- !is.na(x) &
    !is.na(gss[["year"]]) &
    !is.na(gss[["age"]]) &
    !is.na(gss[[weight_var]]) &
    gss[[weight_var]] > 0

  if (!is.null(mode$column)) {
    ok <- ok & !is.na(gss[[mode$column]]) & gss[[mode$column]] == stratum_value
  }

  data <- gss[ok, .(
    score = 100 * (as.numeric(get(variable)) - min_value) / (max_value - min_value),
    year = as.integer(year),
    cohort = as.integer(year - age),
    weight = as.numeric(get(weight_var))
  )]
  data <- data[!is.na(score) & !is.na(cohort)]
  if (nrow(data) < 500) {
    return(NULL)
  }
  years <- sort(unique(data$year))
  if (length(years) < 8 || max(years) - min(years) < 20) {
    return(NULL)
  }
  data
}

extract_decomposition <- function(decomp, n) {
  outcomes <- decomp$detailed[group == "Outcome", .(
    year = as.integer(factor),
    score = as.numeric(value)
  )]
  outcomes <- outcomes[, .(score = mean(score)), by = year]
  setorder(outcomes, year)
  outcomes[, observed_change := score - score[1]]

  component_increments <- decomp$detailed[
    group == "AD" & factor %in% c("IC", "CR"),
    .(year = period2, component = factor, increment = value)
  ]
  components <- dcast(component_increments, year ~ component, value.var = "increment", fill = 0)
  year_frame <- data.table(year = decomp$periods)
  components <- merge(year_frame, components, by = "year", all.x = TRUE)
  for (column in c("IC", "CR")) {
    if (!column %in% names(components)) {
      components[, (column) := 0]
    }
    components[is.na(get(column)), (column) := 0]
  }
  setorder(components, year)
  components[, change := cumsum(IC)]
  components[, replacement := cumsum(CR)]
  components[, c("IC", "CR") := NULL]

  series <- merge(outcomes, components, by = "year", all.x = TRUE)
  setorder(series, year)
  series <- series[, .(
    year,
    score = round_vector(score),
    observed = round_vector(observed_change),
    change = round_vector(change),
    replacement = round_vector(replacement)
  )]

  final <- series[.N]
  total <- final$observed
  change <- final$change
  replacement <- final$replacement
  denominator <- if (!is.na(total) && abs(total) > 1e-8) total else NA_real_

  list(
    n = n,
    first_year = series$year[1],
    last_year = series$year[nrow(series)],
    years = nrow(series),
    start_score = round_number(series$score[1]),
    end_score = round_number(final$score),
    total = round_number(total),
    change = round_number(change),
    replacement = round_number(replacement),
    change_share = round_number(100 * change / denominator, 1),
    replacement_share = round_number(100 * replacement / denominator, 1),
    series = as.data.frame(series)
  )
}

compute_one <- function(gss, variable_row, weight_var, mode, stratum_value = NULL) {
  data <- build_input(
    gss = gss,
    variable = variable_row$variable,
    min_value = variable_row$min_value,
    max_value = variable_row$max_value,
    weight_var = weight_var,
    mode = mode,
    stratum_value = stratum_value
  )
  if (is.null(data)) {
    return(NULL)
  }

  decomp <- tryCatch(
    suppressWarnings(socialchange::cr_ic(data, score ~ year + cohort, weight = "weight")),
    error = function(error) NULL
  )
  if (is.null(decomp)) {
    return(NULL)
  }
  extract_decomposition(decomp, nrow(data))
}

make_result <- function(gss, variable_row, weight_var, mode, stratum_value = NULL) {
  extracted <- compute_one(gss, variable_row, weight_var, mode, stratum_value)
  if (is.null(extracted)) {
    return(NULL)
  }
  stratum_id <- if (is.null(stratum_value)) "all" else safe_id(stratum_value)
  stratum_name <- if (is.null(stratum_value)) "All respondents" else stratum_label(stratum_value)

  list(
    variable = variable_row$variable,
    mode = mode$id,
    mode_label = mode$label,
    stratum = stratum_id,
    stratum_label = stratum_name,
    n = extracted$n,
    first_year = extracted$first_year,
    last_year = extracted$last_year,
    years = extracted$years,
    start_score = extracted$start_score,
    end_score = extracted$end_score,
    total = extracted$total,
    change = extracted$change,
    replacement = extracted$replacement,
    change_share = extracted$change_share,
    replacement_share = extracted$replacement_share,
    series = extracted$series
  )
}

args <- parse_args(commandArgs(trailingOnly = TRUE))

message("Loading GSS cumulative file from gssr...")
data(gss_all, package = "gssr")
gss <- as.data.table(gss_all)
weight_var <- if ("wtssps" %in% names(gss)) "wtssps" else "wtssall"
message("Using ", weight_var, " as the survey weight.")

gss[, gender_label := as.character(labelled::to_factor(sex))]
gss[, race_label := as.character(labelled::to_factor(race))]
gss[, gender_race_label := fifelse(
  is.na(gender_label) | is.na(race_label),
  NA_character_,
  paste(gender_label, race_label, sep = "_")
)]

modes <- list(
  list(id = "none", label = "None", column = NULL),
  list(id = "gender", label = "Gender", column = "gender_label"),
  list(id = "race", label = "Race", column = "race_label"),
  list(id = "gender_race", label = "Gender + Race", column = "gender_race_label")
)

message("Selecting candidate variables...")
candidates <- candidate_variables(gss, weight_var)
message("Candidate pool: ", nrow(candidates), " variables.")

variables <- list()
results <- list()
failures <- list()

for (row_index in seq_len(nrow(candidates))) {
  variable_row <- candidates[row_index]
  message("[", length(variables) + 1, "/", args$limit, "] ", variable_row$variable, ": ", clean_label(variable_row$label))

  variable_results <- list()
  base_result <- make_result(gss, variable_row, weight_var, modes[[1]])
  if (is.null(base_result)) {
    failures[[length(failures) + 1]] <- list(variable = variable_row$variable, reason = "base decomposition failed")
    next
  }
  variable_results[[length(variable_results) + 1]] <- base_result

  for (mode in modes[-1]) {
    strata <- sort(unique(gss[[mode$column]]))
    strata <- strata[!is.na(strata)]
    for (stratum in strata) {
      result <- make_result(gss, variable_row, weight_var, mode, stratum)
      if (!is.null(result)) {
        variable_results[[length(variable_results) + 1]] <- result
      }
    }
  }

  mode_counts <- table(vapply(variable_results, `[[`, character(1), "mode"))
  if (!all(vapply(modes, function(mode) mode$id %in% names(mode_counts), logical(1)))) {
    failures[[length(failures) + 1]] <- list(variable = variable_row$variable, reason = "missing at least one stratification mode")
    next
  }

  variable_object <- list(
    id = variable_row$variable,
    label = clean_label(variable_row$label),
    low_label = value_label(gss[[variable_row$variable]], variable_row$min_value),
    high_label = value_label(gss[[variable_row$variable]], variable_row$max_value),
    min_value = variable_row$min_value,
    max_value = variable_row$max_value,
    n_unique = variable_row$n_unique,
    first_year = base_result$first_year,
    last_year = base_result$last_year,
    n = base_result$n,
    total = base_result$total,
    change = base_result$change,
    replacement = base_result$replacement
  )

  variables[[length(variables) + 1]] <- variable_object
  results <- c(results, variable_results)

  if (length(variables) >= args$limit) {
    break
  }
}

if (length(variables) < args$limit) {
  warning("Only generated ", length(variables), " variables out of requested ", args$limit)
}

payload <- list(
  metadata = list(
    title = "GSS Change Decomposition",
    generated_at = format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z"),
    variable_count = length(variables),
    result_count = length(results),
    source = "General Social Survey cumulative file via gssr::gss_all",
    source_years = paste(range(as.integer(gss$year), na.rm = TRUE), collapse = "-"),
    weight = weight_var,
    method = "socialchange::cr_ic algebraic decomposition (AD): intracohort change plus cohort replacement",
    scale = "Each response variable is normalized to a 0-100 scale from its lowest to highest observed valid code.",
    package_versions = list(
      socialchange = as.character(packageVersion("socialchange")),
      gssr = as.character(packageVersion("gssr"))
    ),
    modes = lapply(modes, function(mode) {
      list(id = mode$id, label = mode$label)
    }),
    failures = failures
  ),
  variables = variables,
  results = results
)

dir.create(dirname(args$output), recursive = TRUE, showWarnings = FALSE)
jsonlite::write_json(payload, args$output, auto_unbox = TRUE, pretty = TRUE, na = "null", null = "null", digits = 6)
message("Wrote ", args$output)
