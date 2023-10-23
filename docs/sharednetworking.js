
cleanDOI = function(doi) {
    doi = doi.replace("https://doi.org/", "");
    doi = doi.replace("http://doi.org/", "");
    doi = doi.replace("doi.org/", "");
    doi = doi.replace("www.doi.org/", "");
    doi = doi.toLowerCase();
    return (doi)
}

fetchIdentStrats = function () {
   if (currentenv == "offline") {
      var varpromise = new Promise((resolve, reject) => {
         var dummstrats = [{
               strategy: "Selection on observables"
            },
            {
               strategy: "Diff-in-diff"
            },
            {
               strategy: "Regression discontinuity design"
            },
            {
               strategy: "Randomized experiment"
            },
            {
               strategy: "not real data"
            }
         ];

         resolve(dummstrats);
      })

   } else {
    var varreadquery = "SELECT * FROM IDENTIFICATION;";
    var url = "https://www.dolthub.com/api/v1alpha1/jon-mellon/causes-of-human-outcomes/main?q=" + varreadquery;
    var varpromise = fetch(url).then((response) => {
    if (response.ok) {
      let jsonout = response.json();
      return jsonout;
    } else {
      throw new Error("NETWORK RESPONSE ERROR FROM DOLTHUB DOI CALL");
    }
    }).then((response) => {
      return(response.rows);
    });
   }
   varpromise.then((value) => {
      for (var i = 0; i < value.length; i++) {
         allidentifications[i] = value[i].strategy;
      }
      updateSelector("identification", allidentifications);
   });
}

fetchFindingOpts = function () {
   if (currentenv == "offline") {
      var varpromise = new Promise((resolve, reject) => {
         var dummfinds = [{
               finding: "Positive"
            },
            {
               finding: "Negative"
            },
            {
               finding: "Zero"
            },
            {
               finding: "Not real data"
            }
         ];
         resolve(dummfinds);
      })

   } else {
    var varreadquery = "SELECT * FROM FINDINGS;";
    var url = "https://www.dolthub.com/api/v1alpha1/jon-mellon/causes-of-human-outcomes/main?q=" + varreadquery;
    var varpromise = fetch(url).then((response) => {
    if (response.ok) {
      let jsonout = response.json();
      return jsonout;
    } else {
      throw new Error("NETWORK RESPONSE ERROR FROM DOLTHUB DOI CALL");
    }
    }).then((response) => {
      return(response.rows);
    });
   }
   varpromise.then((value) => {
      for (var i = 0; i < value.length; i++) {
         allfindings[i] = value[i].finding;
      }
      updateSelector("finding", allfindings);
   });
}

fetchUOA = function () {
   if (currentenv == "offline") {
      var varpromise = new Promise((resolve, reject) => {
         var dummyvars = [{
            uoa: "Individual"
         }, {
            uoa: "Household"
         }, {
            uoa: "Not real data"
         }];
         resolve(dummyvars);
      })

   } else {
    var varreadquery = "SELECT * FROM uoas;";
    var url = "https://www.dolthub.com/api/v1alpha1/jon-mellon/causes-of-human-outcomes/main?q=" + varreadquery;
    var varpromise = fetch(url).then((response) => {
    if (response.ok) {
      let jsonout = response.json();
      return jsonout;
    } else {
      throw new Error("NETWORK RESPONSE ERROR FROM DOLTHUB DOI CALL");
    }
    }).then((response) => {
      return(response.rows);
    });
   }


   varpromise.then((value) => {
      for (var i = 0; i < value.length; i++) {
         uoas[i] = value[i].uoa;
      }
      updateSelector("uoa", uoas);
   });
}


citationPresent = function(doi) {
    if(citations2.length>0) {
    for (var i = 0; i < citations2.length; i++) {
        if (citations2[i].doi.toLowerCase() == doi.toLowerCase()) {
            return true;
        }
    }  
    }
    return false;
}

getDOIFromCrossRef = function (doi) {
   fetch("https://api.crossref.org/works/" + doi)
      .then((response) => {
         //console.log("crossref API Call");
         if (response.ok) {
            let jsonout = response.json();
            return jsonout;
         } else {
            throw new Error("NETWORK RESPONSE ERROR");
            // error handling here
         }
      })
      .then(data => {
         console.log(data.message);
         studyinfo = data.message;
      })
      .catch((error) => console.error("FETCH ERROR:", error));
}

getDoltStudies = function() {
    var doireadallquery = "SELECT s.*, REPLACE(CONCAT(GROUP_CONCAT(CONCAT(a.given, ' ', a.family) ORDER BY a.id ASC)), ',', ', ') AS authors FROM studies AS s JOIN doiauthors AS a ON s.doi = a.doi GROUP BY s.doi;";
    var url = "https://www.dolthub.com/api/v1alpha1/jon-mellon/causes-of-human-outcomes/main?q=" + doireadallquery;
    if (currentenv != "offline") {
        var doipromise = fetch(url).then((response) => {
            if (response.ok) {
                let jsonout = response.json();
                return jsonout;
            } else {
                throw new Error("NETWORK RESPONSE ERROR FROM DOLTHUB DOI CALL");
            }
        });
    } else {
        var doipromise = new Promise((resolve, reject) => {
            var studytemp = {
                rows: [{
                        authors: "Bob Smith, Joe Bloggs, Davey Jones, Jane Doe",
                        title: "The Causal Effect of Lorem Ipsum on tktk",
                        containertitle: "Journal of Placeholder Studies",
                        published: "2023-07-01",
                        URL: "www.example.com",
                        doi: "12345a"
                    },
                    {
                        authors: "Bob Smith, Joe Bloggs, Davey Jones, Jane Doe",
                        title: "The Causal Effect of tktk on tbc",
                        containertitle: "Placeholder",
                        published: "2023-07-01",
                        URL: "www.example.com",
                        doi: "12345c"
                    },
                    {
                        authors: "Joe Bloggs, Bob Smith, Davey Jones, Jane Doe",
                        title: "On Lorem Ipsum",
                        containertitle: "Journal of Experimental Placeholder Studies",
                        published: "2019-02-01",
                        URL: "www.example.com",
                        doi: "54321"
                    },
                    {
                        authors: "Joe Bloggs, Bob Smith, Davey Jones, Jane Doe",
                        title: "The Causal Effect of Lorem Ipsum on tktk",
                        containertitle: "Placeholder Studies Quarterly",
                        published: "2023-07-01",
                        URL: "www.example.com",
                        doi: "243"
                    },
                    {
                        authors: "Bob Smith, Davey Jones, Jane Doe",
                        title: "The Causal Effect of Lorem Ipsum on tktk",
                        containertitle: "American Placeholder Studies Review",
                        published: "2003-07-21",
                        URL: "www.example.com",
                        doi: "244"
                    },
                    {
                        authors: "Joe Bloggs",
                        title: "The Causal Effect of Lorem Ipsum on tktk",
                        containertitle: "Annual Review of Placeholder Studies",
                        published: "1922-01-01",
                        URL: "www.example.com",
                        doi: "6789"
                    },
                ]
            };
            resolve(studytemp);
        })
    }

    doipromise.then((response) => {
        for (var i = 0; i < response.rows.length; i++) {
            citations2.push(response.rows[i]);
        }
        if(page!="adder") {
          fetchAllCrossRef();  
        }
        
    });
  if(page!="adder") {
    try {
      
        createEdgeTable();
    } catch (e) {

    }
  }
}