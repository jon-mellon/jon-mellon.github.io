library(blogdown)
db.path <- "/Users/jonmellon/Dropbox"
resume_src <- file.path(db.path, "paperwork/achievements/cv_updated.pdf")
resume_dest <- "static/uploads/resume.pdf"

dir.create("static/uploads", recursive = TRUE, showWarnings = FALSE)
if (file.exists(resume_src)) {
  file.copy(from = resume_src, to = resume_dest, overwrite = TRUE)
} else {
  warning(paste("Resume source not found:", resume_src))
}


blogdown::stop_server()

blogdown::build_site()

unlink("docs", recursive = TRUE, force = TRUE)
R.utils::copyDirectory("public", "docs")
file.copy("CNAME", "docs/CNAME")
blogdown::serve_site()

