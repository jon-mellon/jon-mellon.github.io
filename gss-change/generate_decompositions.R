#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(data.table)
  library(gssr)
  library(gssrdoc)
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
    limit = 200L,
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
  x <- gsub("\\bopp\\.\\b", "opposite", x, ignore.case = TRUE)
  x <- gsub("\\s+", " ", trimws(x))
  title_case(x)
}

clean_question_text <- function(x) {
  x <- as.character(x %||% "")
  x <- gsub("\r\n|\r", "\n", x)
  x <- gsub("[ \t]+", " ", x)
  x <- gsub(" *\n *", "\n", x)
  trimws(x)
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

invalid_label_pattern <- paste(c(
  "don't know", "do not know", "^dk$", "dk, na", "no answer", "iap",
  "not imputable", "refused", "skipped", "uncodeable", "not available",
  "see codebook", "can't choose", "cannot choose", "other \\(vol\\)",
  "^other$", "^depends$", "depends on", "wouldnt", "wouldn't", "uncertain",
  "inappropriate", "no children", "leaving labor force",
  "i don't have a job", "don't have a job"
), collapse = "|")

value_labels_table <- function(x) {
  labels <- labelled::val_labels(x)
  labels <- labels[!is.na(labels)]
  if (!length(labels)) {
    return(data.table(value = numeric(), label = character()))
  }
  data.table(
    value = as.numeric(labels),
    label = names(labels)
  )[!is.na(value)]
}

actual_values <- function(gss, variable, weight_var) {
  x <- as.numeric(gss[[variable]])
  ok <- !is.na(x) &
    !is.na(gss[["year"]]) &
    !is.na(gss[["age"]]) &
    !is.na(gss[[weight_var]]) &
    gss[[weight_var]] > 0
  sort(unique(x[ok]))
}

valid_values_for <- function(gss, variable, weight_var) {
  actual <- actual_values(gss, variable, weight_var)
  labels <- value_labels_table(gss[[variable]])
  if (nrow(labels)) {
    labels <- labels[!grepl(invalid_label_pattern, label, ignore.case = TRUE)]
    actual <- intersect(actual, sort(unique(labels$value)))
  }
  if (exists("valid_value_overrides", inherits = TRUE) && variable %in% names(valid_value_overrides)) {
    actual <- intersect(actual, valid_value_overrides[[variable]])
  }
  sort(actual)
}

value_label <- function(x, value) {
  labels <- value_labels_table(x)
  if (!nrow(labels)) {
    return(as.character(value))
  }
  target <- as.numeric(value)
  matched <- labels[labels$value == target]$label[1] %||% as.character(value)
  clean_label(matched)
}

value_labels_for <- function(x, values) {
  lapply(values, function(value) {
    list(
      value = as.numeric(value),
      label = value_label(x, value)
    )
  })
}

named_value <- function(x, name, default = NULL) {
  if (!is.null(names(x)) && name %in% names(x)) {
    return(unname(x[[name]]))
  }
  default
}

score_values <- function(values, valid_values, high_end) {
  ranks <- match(as.numeric(values), valid_values)
  scores <- rep(NA_real_, length(values))
  valid <- !is.na(ranks)
  if (length(valid_values) < 2) {
    return(scores)
  }
  if (identical(high_end, "min")) {
    scores[valid] <- 100 * (length(valid_values) - ranks[valid]) / (length(valid_values) - 1)
  } else {
    scores[valid] <- 100 * (ranks[valid] - 1) / (length(valid_values) - 1)
  }
  scores
}

scale_type_for <- function(valid_values) {
  if (length(valid_values) == 2) {
    "binary"
  } else {
    "ordinal_index"
  }
}

score_note_for <- function(scale_type) {
  if (identical(scale_type, "binary")) {
    return("Binary item: the oriented score is the weighted percent choosing the Score 100 response.")
  }
  paste(
    "Ordered multi-category item: the oriented score is a weighted mean of reviewed ordered response ranks on a 0-100 scale.",
    "It is an index, not a percent."
  )
}

make_question_lookup <- function() {
  data(gss_doc, package = "gssrdoc")
  lookup <- as.data.table(gss_doc)
  lookup[, variable := tolower(variable)]
  lookup[, question := clean_question_text(question)]
  lookup[, description := clean_question_text(description)]
  setkey(lookup, variable)
  lookup
}

question_for <- function(question_lookup, variable) {
  key_value <- tolower(as.character(variable))
  doc <- question_lookup[J(key_value), nomatch = 0]
  if (!nrow(doc)) {
    return(list(
      question_text = NULL,
      source_url = NULL,
      source_description = NULL
    ))
  }
  list(
    question_text = doc$question[1] %||% NULL,
    source_url = doc$norc_url[1] %||% NULL,
    source_description = doc$description[1] %||% NULL
  )
}

manual_item_specs <- function() {
  # 100 is the reviewed affirmative, agreement, approval, confidence, or
  # "more of the named spending/condition" end of the substantive response set.
  high_min <- c(
    "attend", "fund", "satfin", "happy", "satjob", "hapmar", "reliten",
    "health", "raclive", "fund16",
    "abhlth", "abdefect", "abnomore", "absingle", "abpoor", "abrape", "abany",
    "nateduc", "natheal", "natcrime", "natfare", "natenvir", "natarms", "natdrug",
    "nataid", "natspac", "natrace", "natcity", "nateducy", "natfarey", "nathealy",
    "natcrimy", "nataidy", "natenviy", "natarmsy", "natdrugy", "natspacy",
    "natracey", "natcityy", "natpark", "natmass", "natsci", "natchld",
    "conmedic", "coneduc", "contv", "conpress", "conarmy", "confed", "conlegis",
    "conclerg", "conbus", "conjudge", "consci", "conlabor", "confinan",
    "gunlaw", "cappun", "colath", "spkath", "libath", "spkcom", "libcom",
    "colcom", "colrac", "colhomo", "spkhomo", "libhomo", "spkrac", "librac",
    "colmil", "spkmil", "libmil", "colmslm", "libmslm", "spkmslm", "spklang",
    "life", "polmurdr", "polescap", "polattak", "polabuse", "polhitok",
    "trust", "helpful", "fair", "postlife", "grass", "divlaw", "sexeduc",
    "fepol", "fechld", "fefam", "fepresch", "fepres", "fehire", "fejobaff",
    "eqwlth", "suicide1", "suicide2", "suicide3", "suicide4", "letdie1",
    "prayer", "helpblk", "helpsick", "helppoor", "helpnot", "racdif1",
    "racdif2", "racdif3", "racdif4", "racmar", "racpres", "discaff", "workwhts",
    "workblks", "wlthwhts", "wlthblks", "busing", "wrkwayup", "marblk",
    "liveblks", "affrmact", "racfew", "intlwhts", "intlblks", "racseg",
    "racpush", "racchng", "livewhts", "marhisp", "marasian", "marwht",
    "intrace1", "closeblk", "closewht", "bible", "pray", "relactiv", "relexp",
    "relexper", "reborn", "savesoul", "god", "spanking", "teensex", "pillok",
    "porninf", "pornmorl", "pornrape", "pornout", "wirtap", "usun", "commun",
    "goveqinc", "equalize", "taxrich", "incgap", "aidunemp", "aidold",
    "indusgen", "watergen", "chemgen", "tempgen", "harmgood", "nextgen",
    "toofast", "advfront", "balpos", "poleff11", "meovrwrk", "manvsemp",
    "wkvsfam", "famvswk", "wkageism", "wkracism", "jobsecok", "supcares",
    "cantrust", "knowwhat", "learnnew", "workdiff", "myskills", "respect",
    "satjob1", "wkharoth", "wkdecide", "wkharsex", "wkfreedm", "prodctiv",
    "safehlth", "opdevel", "wksmooth", "trustman", "safetywk", "proudemp",
    "cowrkhlp", "jobfind1", "safefrst", "fringeok", "teamsafe", "cowrkint",
    "wkpraise", "promteok", "fairearn", "condemnd", "suphelp", "trdunion",
    "promtefr", "unemp", "fear", "owngun", "news", "richwork", "socrel",
    "socommun", "socfrend", "socbar", "getahead", "aged", "joblose", "jobfind",
    "helpoth", "obey", "popular", "thnkself", "workhard", "uswary", "racclos",
    "racdis", "mawork", "satcity", "satfrnd", "sathealt", "sathobby", "fework",
    "fehome", "anomia7", "anomia6", "anomia5", "memchurh", "memsport",
    "memvet", "memunion", "mempolit", "memfrat", "memserv", "memhobby",
    "memprof", "memyouth", "memlit", "memfarm", "memnat", "memother", "usintl",
    "burglr", "robbry", "hit", "gun", "hitok", "hitmarch", "hitrobbr",
    "hitdrunk", "hitchild", "hitbeatr", "relatsex", "discaffm", "discaffw",
    "goodlife", "jobmeans", "jobsec", "jobpromo", "jobhour", "drink", "smoke",
    "drunk"
  )

  high_max <- c(
    "attend", "polviews", "homosex", "premarsx", "pornlaw", "finrela",
    "libath", "libcom", "libhomo", "librac", "libmil", "libmslm",
    "fair", "intlwhts", "intlblks", "commun", "god"
  )

  reviewed_order <- unique(c(
    "attend", "fund", "satfin", "happy", "finrela", "satjob", "hapmar",
    "reliten", "health", "raclive", "fund16",
    "abhlth", "abdefect", "abnomore", "absingle", "abpoor", "abrape", "abany",
    "nateduc", "natheal", "natcrime", "natfare", "natenvir", "natarms", "natdrug",
    "nataid", "natspac", "natrace", "natcity", "polviews", "cappun",
    "conmedic", "coneduc", "contv", "conpress", "conarmy", "confed", "conlegis",
    "conclerg", "conbus", "conjudge", "consci", "conlabor", "confinan",
    "gunlaw", "colath", "spkath", "libath", "spkcom", "libcom", "colcom",
    "life", "pornlaw", "premarsx", "polmurdr", "homosex", "polescap", "trust",
    "helpful", "fair", "polattak", "polabuse", "polhitok", "postlife", "grass",
    "divlaw", "sexeduc", "colrac", "colhomo", "spkhomo", "libhomo", "spkrac",
    "librac", "fepol", "eqwlth", "suicide2", "suicide4", "suicide1", "letdie1",
    "prayer", "helpblk", "helpsick", "helppoor", "helpnot", "colmil", "spkmil",
    "suicide3", "libmil", "nateducy", "natfarey", "nathealy", "natcrimy",
    "nataidy", "natenviy", "natarmsy", "natdrugy", "natspacy", "natracey",
    "natcityy", "natpark", "natmass", "natsci", "natchld", "fechld", "fefam",
    "fepresch", "fepres", "fehire", "fejobaff", "racdif1", "racdif2", "racdif3",
    "racdif4", "racmar", "racpres", "discaff", "workwhts", "workblks",
    "wlthwhts", "wlthblks", "busing", "wrkwayup", "marblk", "liveblks",
    "affrmact", "racfew", "meovrwrk", "intlwhts", "intlblks", "racseg",
    "commun", "porninf", "pornmorl", "pornrape", "pornout", "racpush", "wirtap",
    "usun", "marhisp", "marasian", "marwht", "livewhts", "racchng", "intrace1",
    "closeblk", "closewht", "bible", "pray", "relactiv", "relexp", "relexper",
    "reborn", "savesoul", "god", "spanking", "teensex", "pillok", "colmslm",
    "libmslm", "spkmslm", "spklang", "goveqinc", "equalize", "taxrich",
    "incgap", "aidunemp", "aidold", "indusgen", "watergen", "chemgen", "tempgen",
    "harmgood", "nextgen", "toofast", "advfront", "balpos", "poleff11",
    "manvsemp", "wkvsfam", "famvswk", "wkageism", "wkracism", "jobsecok",
    "supcares", "cantrust", "knowwhat", "learnnew", "workdiff", "myskills",
    "respect", "satjob1", "wkharoth", "wkdecide", "wkharsex", "wkfreedm",
    "prodctiv", "safehlth", "opdevel", "wksmooth", "trustman", "safetywk",
    "proudemp", "cowrkhlp", "jobfind1", "safefrst", "fringeok", "teamsafe",
    "cowrkint", "wkpraise", "promteok", "fairearn", "condemnd", "suphelp",
    "trdunion", "promtefr", "unemp", "fear", "owngun", "news", "richwork",
    "socrel", "socommun", "socfrend", "socbar", "getahead", "aged", "joblose",
    "jobfind", "helpoth", "obey", "popular", "thnkself", "workhard", "uswary",
    "racclos", "racdis", "mawork", "satcity", "satfrnd", "sathealt",
    "sathobby", "fework", "fehome", "anomia7", "anomia6", "anomia5",
    "memchurh", "memsport", "memvet", "memunion", "mempolit", "memfrat",
    "memserv", "memhobby", "memprof", "memyouth", "memlit", "memfarm",
    "memnat", "memother", "usintl", "burglr", "robbry", "hit", "gun",
    "hitok", "hitmarch", "hitrobbr", "hitdrunk", "hitchild", "hitbeatr",
    "relatsex", "discaffm", "discaffw", "goodlife", "jobmeans", "jobsec",
    "jobpromo", "jobhour", "drink", "smoke", "drunk"
  ))

  high_end <- c(
    setNames(rep("min", length(high_min)), high_min),
    setNames(rep("max", length(high_max)), high_max)
  )
  high_end <- high_end[!duplicated(names(high_end), fromLast = TRUE)]

  list(
    order = reviewed_order,
    high_end = high_end
  )
}

label_overrides <- c(
  nateduc = "Federal spending on education",
  natheal = "Federal spending on health",
  natcrime = "Federal spending on law enforcement",
  natfare = "Federal spending on welfare",
  natenvir = "Federal spending on the environment",
  natarms = "Federal spending on military, armaments, and defense",
  natdrug = "Federal spending on drug rehabilitation",
  nataid = "Federal spending on foreign aid",
  natspac = "Federal spending on space exploration",
  natrace = "Federal spending to improve conditions of Black people",
  natcity = "Federal spending to solve problems of big cities",
  nateducy = "Federal spending on education",
  natfarey = "Federal spending on welfare",
  nathealy = "Federal spending on health",
  natcrimy = "Federal spending on law enforcement",
  nataidy = "Federal spending on foreign aid",
  natenviy = "Federal spending on the environment",
  natarmsy = "Federal spending on military, armaments, and defense",
  natdrugy = "Federal spending on drug rehabilitation",
  natspacy = "Federal spending on space exploration",
  natracey = "Federal spending to improve conditions of Black people",
  natcityy = "Federal spending to solve problems of big cities",
  natpark = "Federal spending on parks and recreation",
  natmass = "Federal spending on mass transportation",
  natsci = "Federal spending on scientific research",
  natchld = "Federal spending on assistance for child care",
  raclive = "Any opposite-race family in respondent's neighborhood",
  conmedic = "Confidence in medicine",
  coneduc = "Confidence in education",
  contv = "Confidence in television",
  conpress = "Confidence in the press",
  conarmy = "Confidence in the military",
  confed = "Confidence in the executive branch",
  conlegis = "Confidence in Congress",
  conclerg = "Confidence in organized religion",
  conbus = "Confidence in major companies",
  conjudge = "Confidence in the Supreme Court",
  consci = "Confidence in the scientific community",
  conlabor = "Confidence in organized labor",
  confinan = "Confidence in banks and financial institutions",
  colath = "Allow an anti-religionist to teach college",
  spkath = "Allow an anti-religionist to speak",
  libath = "Keep an anti-religionist's book in the library",
  colcom = "Should a communist teacher be fired",
  spkcom = "Allow a communist to speak",
  libcom = "Keep a communist's book in the library",
  colhomo = "Allow a homosexual person to teach college",
  spkhomo = "Allow a homosexual person to speak",
  libhomo = "Keep a homosexual person's book in the library",
  colrac = "Allow a racist to teach college",
  spkrac = "Allow a racist to speak",
  librac = "Keep a racist's book in the library",
  colmil = "Allow a militarist to teach college",
  spkmil = "Allow a militarist to speak",
  libmil = "Keep a militarist's book in the library",
  colmslm = "Allow an anti-American Muslim cleric to teach college",
  spkmslm = "Allow an anti-American Muslim cleric to preach",
  libmslm = "Keep an anti-American Muslim cleric's book in the library",
  cappun = "Favor the death penalty for murder",
  gunlaw = "Favor requiring police permits before buying guns",
  grass = "Marijuana should be made legal",
  divlaw = "Divorce should be easier to obtain",
  sexeduc = "Favor sex education in public schools",
  fepol = "Women are not suited for politics",
  fechld = "A working mother does not hurt children",
  fefam = "Women should take care of running their homes",
  fepresch = "A preschool child suffers if mother works",
  fepres = "Would vote for a qualified woman for president",
  racdif1 = "Differences due to discrimination",
  racdif2 = "Differences due to inborn ability",
  racdif3 = "Differences due to lack of education",
  racdif4 = "Differences due to lack of will",
  taxrich = "Taxes on high-income people are too high",
  indusgen = "Air pollution from industry is dangerous to the environment",
  watergen = "Water pollution is dangerous to the environment",
  chemgen = "Chemicals and pesticides are dangerous to the environment",
  tempgen = "Rising world temperature is dangerous to the environment"
)

valid_value_overrides <- list(
  divlaw = c(1, 2),
  fair = c(1, 2),
  fepres = c(1, 2),
  joblose = c(1, 2, 3, 4)
)

make_reviewed_specs <- function(gss, weight_var) {
  manual <- manual_item_specs()
  present <- manual$order[manual$order %in% names(gss)]
  missing <- setdiff(manual$order, names(gss))
  if (length(missing)) {
    message("Skipping variables not present in this GSS release: ", paste(missing, collapse = ", "))
  }

  specs <- rbindlist(lapply(present, function(variable) {
    valid_values <- valid_values_for(gss, variable, weight_var)
    if (length(valid_values) < 2 || length(valid_values) > 12) {
      return(NULL)
    }

    years <- sort(unique(as.integer(gss$year[
      !is.na(gss[[variable]]) &
        as.numeric(gss[[variable]]) %in% valid_values &
        !is.na(gss$age) &
        !is.na(gss[[weight_var]]) &
        gss[[weight_var]] > 0
    ])))
    if (length(years) < 8 || max(years) - min(years) < 20) {
      return(NULL)
    }

    label <- named_value(label_overrides, variable, NULL) %||% labelled::var_label(gss[[variable]]) %||% variable
    high_end <- named_value(manual$high_end, variable, "min")
    high_value <- if (identical(high_end, "min")) min(valid_values) else max(valid_values)
    low_value <- if (identical(high_end, "min")) max(valid_values) else min(valid_values)
    scale_type <- scale_type_for(valid_values)

    data.table(
      variable = variable,
      label = as.character(label),
      scale_type = scale_type,
      score_note = score_note_for(scale_type),
      high_end = high_end,
      low_value = low_value,
      high_value = high_value,
      n_unique = length(valid_values),
      first_year = min(years),
      last_year = max(years),
      n_years = length(years),
      valid_values = list(as.numeric(valid_values))
    )
  }), fill = TRUE)

  specs
}

build_input <- function(gss, spec, weight_var, mode, stratum_value = NULL) {
  variable <- spec$variable
  valid_values <- spec$valid_values[[1]]
  x <- as.numeric(gss[[variable]])
  scores <- score_values(x, valid_values, spec$high_end)

  ok <- !is.na(scores) &
    !is.na(gss[["year"]]) &
    !is.na(gss[["age"]]) &
    !is.na(gss[[weight_var]]) &
    gss[[weight_var]] > 0

  if (!is.null(mode$column)) {
    ok <- ok & !is.na(gss[[mode$column]]) & gss[[mode$column]] == stratum_value
  }

  data <- gss[ok, .(
    score = scores[ok],
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
  baseline <- series$score[1]
  series[, change_level := baseline + change]
  series[, replacement_level := baseline + replacement]
  series <- series[, .(
    year,
    score = round_vector(score),
    observed = round_vector(observed_change),
    change = round_vector(change),
    replacement = round_vector(replacement),
    change_level = round_vector(change_level),
    replacement_level = round_vector(replacement_level)
  )]

  final <- series[.N]
  total <- final$observed
  change <- final$change
  replacement <- final$replacement
  signed_denominator <- if (!is.na(total) && abs(total) > 1e-8) total else NA_real_
  abs_denominator <- abs(change) + abs(replacement)
  if (is.na(abs_denominator) || abs_denominator < 1e-8) {
    abs_denominator <- NA_real_
  }

  list(
    n = n,
    first_year = series$year[1],
    last_year = series$year[nrow(series)],
    years = nrow(series),
    baseline = round_number(series$score[1]),
    end_score = round_number(final$score),
    observed_min_score = round_number(min(series$score, na.rm = TRUE)),
    observed_max_score = round_number(max(series$score, na.rm = TRUE)),
    observed_range = round_number(max(series$score, na.rm = TRUE) - min(series$score, na.rm = TRUE)),
    total = round_number(total),
    change = round_number(change),
    replacement = round_number(replacement),
    change_share = round_number(100 * change / signed_denominator, 1),
    replacement_share = round_number(100 * replacement / signed_denominator, 1),
    within_abs_share = round_number(100 * abs(change) / abs_denominator, 1),
    between_abs_share = round_number(100 * abs(replacement) / abs_denominator, 1),
    series = as.data.frame(series)
  )
}

compute_one <- function(gss, spec, weight_var, mode, stratum_value = NULL) {
  data <- build_input(
    gss = gss,
    spec = spec,
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

make_result <- function(gss, spec, weight_var, mode, stratum_value = NULL) {
  extracted <- compute_one(gss, spec, weight_var, mode, stratum_value)
  if (is.null(extracted)) {
    return(NULL)
  }
  stratum_id <- if (is.null(stratum_value)) "all" else safe_id(stratum_value)
  stratum_name <- if (is.null(stratum_value)) "All respondents" else stratum_label(stratum_value)

  list(
    variable = spec$variable,
    mode = mode$id,
    mode_label = mode$label,
    stratum = stratum_id,
    stratum_label = stratum_name,
    n = extracted$n,
    first_year = extracted$first_year,
    last_year = extracted$last_year,
    years = extracted$years,
    baseline = extracted$baseline,
    start_score = extracted$baseline,
    end_score = extracted$end_score,
    observed_min_score = extracted$observed_min_score,
    observed_max_score = extracted$observed_max_score,
    observed_range = extracted$observed_range,
    total = extracted$total,
    change = extracted$change,
    replacement = extracted$replacement,
    change_share = extracted$change_share,
    replacement_share = extracted$replacement_share,
    within_abs_share = extracted$within_abs_share,
    between_abs_share = extracted$between_abs_share,
    series = extracted$series
  )
}

make_variable_object <- function(gss, spec, base_result, question_lookup) {
  valid_values <- spec$valid_values[[1]]
  question <- question_for(question_lookup, spec$variable)
  list(
    id = spec$variable,
    label = clean_label(spec$label),
    question_text = question$question_text,
    source_url = question$source_url,
    source_description = question$source_description,
    scale_type = spec$scale_type,
    score_note = spec$score_note,
    low_label = value_label(gss[[spec$variable]], spec$low_value),
    high_label = value_label(gss[[spec$variable]], spec$high_value),
    low_value = spec$low_value,
    high_value = spec$high_value,
    high_end = spec$high_end,
    valid_values = as.numeric(valid_values),
    value_labels = value_labels_for(gss[[spec$variable]], valid_values),
    n_unique = spec$n_unique,
    first_year = base_result$first_year,
    last_year = base_result$last_year,
    n = base_result$n,
    baseline = base_result$baseline,
    start_score = base_result$baseline,
    end_score = base_result$end_score,
    observed_min_score = base_result$observed_min_score,
    observed_max_score = base_result$observed_max_score,
    observed_range = base_result$observed_range,
    total = base_result$total,
    change = base_result$change,
    replacement = base_result$replacement,
    within_abs_share = base_result$within_abs_share,
    between_abs_share = base_result$between_abs_share
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

message("Building reviewed variable specs...")
specs <- make_reviewed_specs(gss, weight_var)
message("Reviewed pool after validity/year filters: ", nrow(specs), " variables.")
message("Loading full question wording from gssrdoc...")
question_lookup <- make_question_lookup()

variables <- list()
results <- list()
failures <- list()

for (row_index in seq_len(nrow(specs))) {
  spec <- specs[row_index]
  message("[", length(variables) + 1, "/", args$limit, "] ", spec$variable, ": ", clean_label(spec$label))

  variable_results <- list()
  base_result <- make_result(gss, spec, weight_var, modes[[1]])
  if (is.null(base_result)) {
    failures[[length(failures) + 1]] <- list(variable = spec$variable, reason = "base decomposition failed")
    next
  }
  variable_results[[length(variable_results) + 1]] <- base_result

  for (mode in modes[-1]) {
    strata <- sort(unique(gss[[mode$column]]))
    strata <- strata[!is.na(strata)]
    for (stratum in strata) {
      result <- make_result(gss, spec, weight_var, mode, stratum)
      if (!is.null(result)) {
        variable_results[[length(variable_results) + 1]] <- result
      }
    }
  }

  mode_counts <- table(vapply(variable_results, `[[`, character(1), "mode"))
  if (!all(vapply(modes, function(mode) mode$id %in% names(mode_counts), logical(1)))) {
    failures[[length(failures) + 1]] <- list(variable = spec$variable, reason = "missing at least one stratification mode")
    next
  }

  variables[[length(variables) + 1]] <- make_variable_object(gss, spec, base_result, question_lookup)
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
    weight_note = paste(
      "All estimates use the selected GSS survey weight.",
      "Rows with missing or non-positive weights are dropped.",
      "socialchange::cr_ic receives that weight column, computes weighted year-cohort means,",
      "and normalizes weighted cohort proportions within each period before decomposing",
      "intracohort change and cohort replacement."
    ),
    method = "socialchange::cr_ic algebraic decomposition (AD): intracohort change plus cohort replacement",
    scale = paste(
      "Each response variable is mapped to a 0-100 reviewed scale using only substantive valid codes.",
      "100 is the manually selected affirmative/agreement/approval/high-intensity end for the item wording,",
      "and 0 is the opposite end. Explicit other, missing, don't know, no-answer, refused, IAP,",
      "and not-available codes are excluded before scaling.",
      "Binary item scores equal the weighted percent choosing the Score 100 response.",
      "Ordered multi-category item scores are ordinal indices, not percentages; nominal categorical variables are not included."
    ),
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
