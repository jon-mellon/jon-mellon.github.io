
matchLevFromStart <- function(start, candidates,
                              colparts, rowparts,
                              row.remainder,
                              col.remainder) {
  colconstraint <- colparts[start, ]
  rowconstraint <- rowparts[start, ]
  candcolmatch <- t(colconstraint==t(candidates))
  candrowmatch <- t(rowconstraint==t(candidates))
  
  colMatch <- function(x, candmatch, remainder) {
    colamt <- rowSums(candmatch, na.rm = T)
    colamt <- colamt + (rowSums(remainder[x]==candidates & !candmatch , na.rm = T)>0)
    return(colamt)
  }
  
  rowmatchs <- sapply(1:length(col.remainder), 
                      colMatch, candmatch = candrowmatch, 
                      remainder = col.remainder)
  
  colmatchs <- sapply(1:length(row.remainder), 
                      colMatch, candmatch = candcolmatch, 
                      remainder = row.remainder)
  
  matchtotals <- cbind(rowmatchs, colmatchs)
  return(matchtotals)
}

createBoardSolution <- function(words, length.set) {
  unused.letters <- 16
  chosen.words <- c()
  
  while(unused.letters!=0 | length(chosen.words)!=length(length.set)) {
    board <- matrix("", nrow = 8, ncol = 8)
    edges  <- words[words$word_length==8, ]
    edge.pieces <- edges[sample(1:nrow(edges), 2), 1]
    
    max.length <- 8
    row.remainder <- row.orig <- strsplit(edge.pieces[2], "")[[1]]
    col.remainder <- col.orig <- strsplit(edge.pieces[1], "")[[1]]
    colnames(board) <- row.orig
    rownames(board) <- col.orig
    chosen.words <- c()
    
    broken <- FALSE
    for(length in length.set) {
      # length<- 6  
      if(!broken)  {
        max.start <- (max.length - length) + 1
        
        starts <- (1:max.start)
        ends <- starts + (length-1)
        
        
        substrlength <- function(string, start, length) {
          string[start:(start + length - 1)]
        }
        
        candidates <- t(simplify2array(strsplit(words[words$word_length==length, "word"], "")))
        
        colparts <- t(sapply(starts, 
                             string = matrix(col.remainder), 
                             substrlength, length = length))
        rowparts <- t(sapply(starts, 
                             string = row.remainder, 
                             substrlength, length = length))
        
        
        
        
        
        matchtotals <- do.call(cbind, 
                               lapply(starts, matchLevFromStart,
                                      candidates = candidates, 
                                      rowparts = rowparts,
                                      colparts = colparts, 
                                      row.remainder = row.remainder,
                                      col.remainder = col.remainder))
        
        main.start.pos <- inverse.rle(list(values = starts, 
                                           lengths = rep(2 * length(col.remainder), 
                                                         length(starts)) ))
        slot.pos <- rep(rep(1:length(col.remainder), 2), length(starts))
        
        dim.pos <- rep(c(rep("row", length(col.remainder)), 
                         rep("col",length(col.remainder))), 
                       length(starts))
        valid.pos <- rep(TRUE, length(dim.pos)) 
        for(ii in 1:length(dim.pos)) {
          if(dim.pos[ii]=="row") {
            boardtest <- board[slot.pos[ii] , (main.start.pos[ii]:(main.start.pos[ii]+length-1))]
            bt1 <- boardtest!=""
            bt2 <- is.na(boardtest)
            bt1[bt2] <- TRUE
            
            if(any(bt1)) {
              valid.pos[ii] <- FALSE
            }
          }
          if(dim.pos[ii]=="col") {
            boardtest <- board[(main.start.pos[ii]:(main.start.pos[ii]+length-1)), slot.pos[ii]]
            bt1 <- boardtest!=""
            bt2 <- is.na(boardtest)
            bt1[bt2] <- TRUE
            
            if(any(bt1)) {
              valid.pos[ii] <- FALSE
            }
          }
        }
        matchtotals[, !valid.pos] <- 0
        
        matchcounts <- rowMaxs(matchtotals, na.rm = T)
        valid.count <- max(matchcounts)
        
        
        shortlist <- which(matchcounts %in% valid.count)
        
        choice.id <- sample(rep(shortlist,2), 1)
        choice <- candidates[choice.id, ]
        matchcounts[choice.id]
        
        pos.choice.set <- rep(which((matchtotals[choice.id, ]==matchcounts[choice.id])  & valid.pos),2)
        if(length(pos.choice.set)==0) {
          broken <- TRUE
        } else {
          pos.choice <- sample(pos.choice.set,1)  
          
          
          # row.orig
          # col.orig
          
          if(dim.pos[pos.choice]=="row") {
            col.pos <- main.start.pos[pos.choice]:(main.start.pos[pos.choice] + 
                                                     (length-1))
            if(any(is.na(board[slot.pos[pos.choice], col.pos]))) {
              broken <- TRUE
            }
            board[slot.pos[pos.choice], col.pos] <- choice
            
            leftover <- na.omit(choice[row.remainder[col.pos]!=choice])
            row.remainder[col.pos][which(row.remainder[col.pos]==choice)] <- NA
            
            row.deletions <- c(slot.pos[pos.choice]+1, slot.pos[pos.choice]-1)
            row.deletions <- row.deletions[row.deletions %in% 1:ncol(board)]
            board[row.deletions, col.pos] <- NA
            col.deletions <- c(max(col.pos) + 1, min(col.pos) - 1)
            col.deletions <- col.deletions[col.deletions %in% 1:ncol(board)]
            board[slot.pos[pos.choice], col.deletions] <- NA
            
            if(col.remainder[slot.pos[pos.choice]] %in% leftover) {
              col.remainder[slot.pos[pos.choice]] <- NA
            }
          }
          # row.orig
          # col.orig
          
          if(dim.pos[pos.choice]=="col") {
            row.pos <- main.start.pos[pos.choice]:(main.start.pos[pos.choice] + (length(choice)-1))
            if(any(is.na(board[row.pos, slot.pos[pos.choice]]))) {
              broken <- TRUE
            }
            board[row.pos, slot.pos[pos.choice]] <- choice
            
            leftover <- na.omit(choice[col.remainder[row.pos]!=choice])
            col.remainder[row.pos][which(col.remainder[row.pos]==choice)] <- NA
            
            col.deletions <- c(slot.pos[pos.choice]+1, slot.pos[pos.choice]-1)
            col.deletions <- col.deletions[col.deletions %in% 1:ncol(board)]
            board[row.pos, col.deletions] <- NA
            row.deletions <- c(max(row.pos) + 1, min(row.pos) - 1)
            row.deletions <- row.deletions[row.deletions %in% 1:ncol(board)]
            board[row.deletions, slot.pos[pos.choice]] <- NA
            
            if(row.remainder[slot.pos[pos.choice]] %in% leftover) {
              row.remainder[slot.pos[pos.choice]] <- NA
            }
          }
          chosen.words <- c(chosen.words, paste(choice, collapse = ""))
        }   
      }
      
    }
    unused.letters <- sum(!is.na(row.remainder)) +  sum(!is.na(col.remainder))
  }
  colnames(board) <- row.orig
  rownames(board) <- col.orig
  board[is.na(board)] <- ""
  out <- list(board = board, chosen.words = chosen.words)
  return(out)
}