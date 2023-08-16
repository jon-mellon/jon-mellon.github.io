// 

function resetPage() {
  location.reload();
}

function revealStudyCheck() {
  document.getElementById("pubdetails").style.display = "block";
  document.getElementById("pubcheck").style.display = "block";
  document.getElementById("DOI").disabled = true;
}

function revealPrevClaimCheck() {
  document.getElementById("pubdetails").style.display = "block";
  var tempdoi = document.getElementById("DOI").value;
  var claimset = [];
  for (var i = 0; i < alldois.length; i++) {
    if(alldois[i]==tempdoi) {
      claimset.push(allstudies[i].xvariable + " 🡒 " +  allstudies[i].yvariable)
    }
  }
  var claimtext = claimset[0];
  if(claimset.length>1) {
    for (var i = 1; i < claimset.length; i++) {
      claimtext = claimtext + "\n" + claimset[i];
    }
  }  
  
  document.getElementById("prevclaims").innerText = claimtext;
  document.getElementById("prevclaimcheck").style.display = "block";
  document.getElementById("DOI").disabled = true;
}



function DOIchecker() {
  // Dummy function (replace this with actual functionality)
  let doibox = document.getElementById('DOI');
  console.log(doibox.value);
  if(doibox.value=="") {
    return null;
  } 
  if(alldois.includes(doibox.value)) {
    // reveal retry sequence
    DOIInfoCall(doibox.value);
    revealPrevClaimCheck();
    
  } else {
    DOIInfoCall(doibox.value);
    revealStudyCheck();
  }
}

// https://docs.google.com/forms/d/e/1FAIpQLSdXgItq-zrA7Do6vOAuJmtd_nDqYFoZ3l8ypO4EQ0fUoLWA_w/viewform?usp=pp_url&entry.1535032722=test&entry.1128171251=xvar1&entry.860119781=yvar1&entry.1916574635=none&entry.1950636191=1999&entry.1246413525=2001&entry.883997836=positive&entry.756521078=QCA&entry.2108748939=person&entry.163883274=CA;GB&entry.583739099=children&entry.1778787331=120&entry.308413737=table+1(col+a)


getDOIFromCrossRef = function(doi) {
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

DOIInfoCall = function(doi) {
    if(currentenv=="offline") {
      var varpromise = new Promise((resolve, reject) => {
      studyinfo = {
        author: [{family : "Smith", 
                   given : "Bob"},
                   {family : "Bloggs", 
                   given : "Joe"},
                   {family : "Jones", 
                   given : "Davey"},
                   {family : "Doe", 
                   given : "Jane"}], 
        title: ["The Causal Effect of Lorem Ipsum on tktk"],
        "container-title": ["Journal of Placeholder Studies"], 
        published: {"date-parts": [2023, 7]}
      }
      resolve(studyinfo);
    });
  } else {
      var varpromise = fetch("https://api.crossref.org/works/" + doi)
        .then((response) => {
            //console.log("crossref API Call");
            if (response.ok) {
                let jsonout = response.json();
                return jsonout;
            } else {
                throw new Error("NETWORK RESPONSE ERROR");
                // error handling here
            }
        });
      // getDOIFromCrossRef(doi);
    }
    varpromise.then((value) => {
      // put the citation in here
      var authorstr = value.author[0].family;
      if(value.author.length>1) {
        for (var i = 1; i < value.authors.length; i++) {
          authorstr = authorstr + ", " + value.author[i].family;
        }  
      }
      
      var paperstring = authorstr + " (" + value.published["date-parts"][0] + ") " +  value.title + ", " + 
      value["container-title"][0];
      pubtext.innerHTML = paperstring;
    });
  }
  
  
function revealColumns() {
  document.getElementById("pubcheck").style.display = "none";
  document.getElementById("prevclaimcheck").style.display = "none";
  
  document.getElementById('columnentry').classList.remove('invisiblecolumns');
  document.getElementById('columnentry').classList.add('columns');
  document.getElementById("DOI").disabled = true;
}


  fetchAllStudies = function() {
    if(currentenv=="offline") {
        var studypromise = new Promise((resolve, reject) => {

        var studies = [{DOI : "12345", 
          "xvariable": "education",
          "yvariable": "income"
        },
         {DOI : "12345", 
          "xvariable": "education",
          "yvariable": "voting for economic right wing party"
        }, 
        {DOI : "54321", 
          "xvariable": "education",
          "yvariable": "voting for economic right wing party"
        }];
          resolve(studies);
        });
    } else {
      const spreadsheetId = "11hfXFfdpMyDEeMSy3xeO3rsbI7a6UdcaJfJpZZlBJ34"
      const sheetId = 0;
      const sheetName = "causalclaims";
      const sheetInfo = {
          sheetId,
          sheetName
      }
      var studypromise = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo).parse();
    }
     studypromise.then((value) => {
      for (var i = 0; i < value.length; i++) {
        alldois[i] = value[i].DOI;
        allstudies[i] = value[i];
      } 
    });
  }

  
  fetchAllVars = function() {
    if(currentenv=="offline") {
      var varpromise = new Promise((resolve, reject) => {
        var dummyvars = [{"Variablename": "none"},
        {"Variablename": "education"},
        {"Variablename": "income"},
        {"Variablename": "voting for economic right wing party"},
        {"Variablename": "not real data"}]
        
        resolve(dummyvars);
      })
    } else {
      const spreadsheetId = "1JdIwj_x64L6rpEK48acjnctYfrzFIS5HBkb4s27S7L8"
      const sheetId = 0;
      const sheetName = "variables";
      const sheetInfo = {
          sheetId,
          sheetName
      }
      var varpromise = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo).parse();
    }
      varpromise.then((value) => {
      for (var i = 0; i < value.length; i++) {
        allvars[i] = value[i].Variablename;
      }
    });
  }
     

  
   fetchIdentStrats = function() {
    if(currentenv=="offline") {
      var varpromise = new Promise((resolve, reject) => {
        var dummstrats = [{strategy: "Selection on observables"}, 
                          {strategy: "Diff-in-diff"}, 
                          {strategy: "Regression discontinuity design"},
                          {strategy: "Randomized experiment"},
                          {strategy: "not real data"}];
        
        resolve(dummstrats);
      })
      
    } else {
      const spreadsheetId = "1N66GqAVQGcmV4PMQk6B2zDwvSZ3Oa6aF6FXwfKoVUU8"
      const sheetId = 0;
      const sheetName = "identification";
      const sheetInfo = {
          sheetId,
          sheetName
      }
      var varpromise = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo).parse();
    }
    varpromise.then((value) => {
    for (var i = 0; i < value.length; i++) {
      allidentifications[i] = value[i].strategy;
    }
      updateSelector("identification", allidentifications);
    });
  }
  
     

  fetchFindingOpts = function() {
    if(currentenv=="offline") {
      var varpromise = new Promise((resolve, reject) => {
        var dummfinds = [{finding: "Positive"},
                        {finding: "Negative"},
                        {finding: "Zero"}, 
                        {finding: "Not real data"}];
        resolve(dummfinds);
      })
      
    } else {
      const spreadsheetId = "1N66GqAVQGcmV4PMQk6B2zDwvSZ3Oa6aF6FXwfKoVUU8"
      const sheetId = 0;
      const sheetName = "finding";
      const sheetInfo = {
          sheetId,
          sheetName
      }
      var varpromise = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo).parse();
    }
    varpromise.then((value) => {
    for (var i = 0; i < value.length; i++) {
      allfindings[i] = value[i].finding;
    }
    updateSelector("finding", allfindings);
    });
  }
  
  fetchUOA = function() {
    if(currentenv=="offline") {
      var varpromise = new Promise((resolve, reject) => {
        var dummyvars = [{uoa: "Individual"}, {uoa:"Household"}, {uoa: "Not real data"}];
        resolve(dummyvars);
      })
      
    } else {
      const spreadsheetId = "1N66GqAVQGcmV4PMQk6B2zDwvSZ3Oa6aF6FXwfKoVUU8"
      const sheetId = 0;
      const sheetName = "unitofanalysis";
      const sheetInfo = {
          sheetId,
          sheetName
      }
        var varpromise = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo).parse();
      }
   
    
    varpromise.then((value) => {
    for (var i = 0; i < value.length; i++) {
      uoas[i] = value[i].uoa;
    }
    updateSelector("uoa", uoas);
    });
  }
  
    

  
  function updateSelector(id, varset) {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
    if(select.id==id) {
         const selectedOption = select.value;
          while(select.firstChild) select.removeChild(select.firstChild);
                select.append(new Option());

                varset.forEach(variable => {
                    const option = new Option(variable, variable);
                    if(variable === selectedOption) option.selected = true;
                    select.append(option);
                });
      }
    });
        }
  
  function updateAllVars() {
    fetchAllVars();
    const varselects = ["dependent-variable", "independent-variable",            "instrumental-variable", "parent-variable"];
    for (var i = 0; i < varselects.length; i++) {
      
      updateSelector(varselects[i], allvars)
    }
  }
        
        
submitClaim = function() {
      var submissionurl = "https://docs.google.com/forms/d/e/1FAIpQLSdXgItq-zrA7Do6vOAuJmtd_nDqYFoZ3l8ypO4EQ0fUoLWA_w/viewform?usp=pp_url&entry.1535032722=" + claim.doi + 
      "&entry.1128171251=" +claim.xvar + 
      "&entry.860119781=" + claim.yvar + 
      "&entry.1916574635=" + claim.instrument + 
      /*
      "&entry.1950636191=" + claim.xvarstart + 
      "&entry.1246413525=" + claim.xvarend + 
      "&entry.1218728387=" + claim.yvarstart + 
      "&entry.78933920=" + claim.yvarend + 
      */
      "&entry.883997836=" + claim.finding + 
      "&entry.756521078=" + claim.identification + 
      "&entry.2108748939=" + claim.uoa + 
      "&entry.163883274=" + claim.countries + 
      "&entry.583739099=" + claim.subpop + 
      "&entry.1778787331=" + claim.n + 
      "&entry.308413737=" + claim.resultdoc +
      "&entry.1179837611=" + claim.env + 
      "&entry.235701340=" + claim.submitter
      document.getElementById("overlay").style.display = "block";

      window.open(submissionurl, '_blank');

      // show confirmation selection 
      
    }
    
    resetVarSubmission = function () {
      newvar = {name: "", 
                  parentvar: "",
                  vardescription: ""
      };
      varname.value = "";
       parentvar.value = "";
       vardescription.value= ""
    }
    
    updateVarSubmission  = function() {
      newvar.name= varname.value;
      newvar.parentvar = parentvar.value
      newvar.vardescription = vardescription.value;
    }
    
    submitVarClaim = function() {
      var submissionurl =  "https://docs.google.com/forms/d/e/1FAIpQLScWFrxRU7VDtPnKe857jBIPCYFRBNftoICGAUT5xPMuwIJFVA/viewform?usp=pp_url&entry.775303211="+ 
      newvar.name + 
      "&entry.1554052921=" + newvar.parentvar + 
      "&entry.1513559511=" + newvar.vardescription;
    
      document.getElementById("varoverlay").style.display = "block";

      window.open(submissionurl, '_blank');
    }
    
    updateClaimSubmission = function() {
      claim.doi = doicurrent.value;
      claim.xvar = indvar.value;
      claim.yvar = depvar.value;
      claim.instrument = instrvar.value;
      claim.finding = finding.value;
      claim.identification = identification.value;
      claim.uoa = uoa.value;
      let countrystring = "";
      for (var i = 0; i < countries.selectedOptions.length; i++) {
        if(countrystring=="") {
          countrystring = countries.selectedOptions[i].value
        } else {
        countrystring = countrystring + ";" + countries.selectedOptions[i].value;  
        }
        
      }
      claim.countries = countrystring;
      claim.subpop = subpop.value;
      claim.n = nobs.value;
      claim.resultdoc = resultdoc.value;
      claim.submitter = submitter.value;
    }
    
    

    getCausalSheet = function() {
     
      parser.parse().then((items) => {
        for (var i = 0; i < items.length; i++) {
          sheetout[i] = items[i];
        }
      })
    }
    
    
    
    
    