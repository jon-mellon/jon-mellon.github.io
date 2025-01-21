library(blogdown)
file.remove("public/uploads/resume.pdf")
file.remove( "themes/starter-hugo-academic/static/uploads/resume.pdf")
file.copy(from = "C:/Users/jonathan.mellon/Dropbox/paperwork/achievements/cv_updated.pdf", 
          to = "public/uploads/resume.pdf", overwrite = TRUE)
file.copy(from = "C:/Users/jonathan.mellon/Dropbox/paperwork/achievements/cv_updated.pdf", 
          to = "themes/starter-hugo-academic/static/uploads/resume.pdf", overwrite = TRUE)

file.copy(from = "C:/Users/jonathan.mellon/Dropbox/paperwork/achievements/cv_updated.pdf", 
          to = "docs/uploads/resume.pdf", overwrite = TRUE)


blogdown::stop_server()

blogdown::build_site()

unlink("docs", recursive = TRUE, force = TRUE)
R.utils::copyDirectory("public", "docs")
file.copy("CNAME", "docs/CNAME")
blogdown::serve_site()


