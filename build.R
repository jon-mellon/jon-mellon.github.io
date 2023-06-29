library(blogdown)

file.copy(from = "C:/Users/jonathan.mellon/Dropbox/paperwork/achievements/cv_updated.pdf", 
          to = "public/uploads/resume.pdf", overwrite = TRUE)
file.copy(from = "C:/Users/jonathan.mellon/Dropbox/paperwork/achievements/cv_updated.pdf", 
          to = "themes/starter-hugo-academic/static/uploads/resume.pdf", overwrite = TRUE)

blogdown::stop_server()

blogdown::build_site()
blogdown::serve_site()
