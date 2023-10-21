function comparevar(a,b) {
  var al = a.label.toLowerCase();
  var bl = b.label.toLowerCase();
  if (al < bl)
     return -1;
  if (al > bl)
    return 1;
  return 0;
}

matcher = function (term, suggest) {
   term = term.toLowerCase();
   var suggestions = [];
   for (i = 0; i < allvars.length; i++)
      if (~allvars[i].label.toLowerCase().indexOf(term)) {
         suggestions.push(allvars[i].label);
         if (allchildren[i].length > 0) {
            for (var j = 0; j < allchildren[i].length; j++) {
               if (allchildren[i][j] != "") {
                  suggestions.push(allchildren[i][j]);
               }
            }
         }
         if (allparents[i] != "") {
            suggestions.push(allparents[i]);
         }
      }
   suggestions = suggestions.filter(onlyUnique);

   suggest(suggestions);
}

// 
onlyUnique = function (value, index, array) {
   return array.indexOf(value) === index;
}


function resetPage() {
   location.reload();
}

function revealStudyCheck() {
   document.getElementById("pubdetails").style.display = "block";
   document.getElementById("pubcheck").style.display = "block";
   document.getElementById("doicheckbutton").disabled = true;
   document.getElementById("DOI").disabled = true;
}

function revealPrevClaimCheck() {
   document.getElementById("pubdetails").style.display = "block";
   var tempdoi = document.getElementById("DOI").value;
   var claimset = [];
   for (var i = 0; i < alldois.length; i++) {
      if (alldois[i] == tempdoi) {
         claimset.push(allstudies[i]["x variable"] + " 🡒 " + allstudies[i]["y variable"])
      }
   }
   var claimtext = claimset[0];
   if (claimset.length > 1) {
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
   if (doibox.value == "") {
      return null;
   }
   DOIInfoCall(doibox.value);
}

// https://docs.google.com/forms/d/e/1FAIpQLSdXgItq-zrA7Do6vOAuJmtd_nDqYFoZ3l8ypO4EQ0fUoLWA_w/viewform?usp=pp_url&entry.1535032722=test&entry.1128171251=xvar1&entry.860119781=yvar1&entry.1916574635=none&entry.1950636191=1999&entry.1246413525=2001&entry.883997836=positive&entry.756521078=QCA&entry.2108748939=person&entry.163883274=CA;GB&entry.583739099=children&entry.1778787331=120&entry.308413737=table+1(col+a)


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





showDOINotFound = function() {
  document.getElementById("notfound").hidden = false;
}
hideDOINotFound = function() {
  document.getElementById("notfound").hidden = true;
}

DOIInfoCall = function (doi) {
    hideDOINotFound();
   if (currentenv == "offline") {
      var varpromise = new Promise((resolve, reject) => {
        if(doi==98765)  {
          reject("this DOI is not recognized");
        } else {
           var studytemp = {
            message: {
               author: [{
                     family: "Smith",
                     given: "Bob"
                  },
                  {
                     family: "Bloggs",
                     given: "Joe"
                  },
                  {
                     family: "Jones",
                     given: "Davey"
                  },
                  {
                     family: "Doe",
                     given: "Jane"
                  }
               ],
               title: ["The Causal Effect of Lorem Ipsum on tktk"],
               "container-title": ["Journal of Placeholder Studies"],
               published: {
                  "date-parts": [
                     [2023, 7]
                  ]
               }
            }
         };
         resolve(studytemp);
        }
      });
   } else {
      var varpromise = fetch("https://api.crossref.org/works/" + doi)
         .then((response) => {
            //console.log("crossref API Call");
            if (response.ok) {
               let jsonout = response.json();
               return jsonout;
            } else {
               console.log(response);
               if(response.status==404) {
                console.log("DOI not found");
                showDOINotFound();
               }
               throw new Error("NETWORK RESPONSE ERROR");
               // error handling here
            }
         });
   }
   varpromise.then((value) => {
      studyinfo = value.message;
      // put the citation in here
      var authorstr = value.message.author[0].family;
      if (value.message.author.length > 1) {
         for (var i = 1; i < value.message.author.length; i++) {
            authorstr = authorstr + ", " + value.message.author[i].family;
         }
      }

      var paperstring = authorstr + " (" + value.message.published["date-parts"][0][0] + ") " + value.message.title + ", " +
         value.message["container-title"][0];
      pubtext.innerHTML = paperstring;
      
      
      if (alldois.includes(doi)) {
        hideDOIImage();
        revealPrevClaimCheck();
      } else {
        revealStudyCheck();
        hideDOIImage();
      }
   })
   .catch((reason) => {
     console.error(reason);
   })
}


function revealColumns() {
   document.getElementById("pubcheck").style.display = "none";
   document.getElementById("prevclaimcheck").style.display = "none";

   document.getElementById('columnentry').classList.remove('invisiblecolumns');
   document.getElementById('columnentry').classList.add('columns');
   document.getElementById("DOI").disabled = true;
   document.getElementById("doicheckbutton").disabled = true;

}

hideDOIImage = function() {
  document.getElementById("exampledoi").classList.add('hidden');
}


fetchAllStudies = function () {
   if (currentenv == "offline") {
      var studypromise = new Promise((resolve, reject) => {

         var studies = [{
               DOI: "12345",
               "x variable": "education",
               "y variable": "income"
            },
            {
               DOI: "12345",
               "x variable": "education",
               "y variable": "voting for economic right wing party"
            },
            {
               DOI: "54321",
               "x variable": "education",
               "y variable": "voting for economic right wing party"
            }
         ];
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

allVarInclude = function(text) {
  for (var i = 0; i < allvars.length; i++) {
    if(allvars[i].label==text) {
      return true;
    }
  }
  return false;
}

wipeInvalidAnswer = function (selector) {
   if (!allVarInclude(document.getElementById(selector).value)) {
      document.getElementById(selector).value = ""
   } else {
      updateClaimSubmission();
      updateVarSubmission();
   }
}

validateYear = function (selector) {
   var year = document.getElementById(selector).value;
   year = year.replace(" ", "");
   year = year.replace(",", "");
   document.getElementById(selector).value = year;
   var yr = Number(year);

   if (!(yr < 3000)) {
      document.getElementById(selector).value = ""
   } else {
      updateClaimSubmission();
   }
}

validatePosInteger = function (selector) {
   var numint = document.getElementById(selector).value;
   numint = numint.replace(" ", "");
   numint = numint.replace(",", "");
   document.getElementById(selector).value = numint;
   var numnum = Number(numint);

   if (!(numnum > 0)) {
      document.getElementById(selector).value = ""
   } else {
      updateClaimSubmission();
   }
}

fetchAllVars = function () {
   if (currentenv == "offline") {
      var varpromise = new Promise((resolve, reject) => {
         var dummyvars = [
            {
               id: "D0",
               "Variablename": "education",
               Parent: ""
            },
            {
               id: "D7",
               "Variablename": "years of schooling",
               Parent: "education",
               parentid: "D0"
            },
            {
              id: "D1",
               "Variablename": "income",
               Parent: ""
            },
            {
               id: "D4",
               "Variablename": "individual income",
               Parent: "income",
               parentid: "D1"
            },
            {
               id: "D5",
               "Variablename": "voting for economic right wing party",
               Parent: "voting for party",
               parentid: "D2"
            },
            {
               id: "D2",
               "Variablename": "voting for party",
               Parent: ""
            },
            {
               id: "D6",
               "Variablename": "not real data",
               Parent: ""
            }
         ]

         resolve(dummyvars);
      })
   } else {
      if(backend=="gs") {
        const spreadsheetId = "1JdIwj_x64L6rpEK48acjnctYfrzFIS5HBkb4s27S7L8"
        const sheetId = 0;
        const sheetName = "variables";
        const sheetInfo = {
           sheetId,
          sheetName
        }
        var varpromise = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo).parse();
      }
      if(backend=="dolthub") {
        var varpromise = fetch('https://www.dolthub.com/api/v1alpha1/jon-mellon/causes-of-human-outcomes/main?q=SELECT v1.id AS id, v1.timestamp, v1.parent AS parentid, v1.label AS label, v2.label AS parentlabel FROM variables v1 LEFT JOIN variables v2 ON v1.parent = v2.id;').then((response) => {
          return(response.json());
        }).then((response) => {
          var output = [];
          for (var i = 0; i < response.rows.length; i++) {
            output[i] = { 
                          id: response.rows[i].id,
                          Timestamp: response.rows[i].timestamp,
                          Variablename: response.rows[i].label,
                          Parent: response.rows[i].parentlabel,
                          parentid: response.rows[i].parentid,
                        };
          }
          return(output);
        });
      }
   }
   
   varpromise.then((value) => {
      for (var i = 0; i < value.length; i++) {
         allvars[i] = {
           label: value[i].Variablename, 
           id: value[i].id,
           parentid: value[i].parentid,
           parentlabel: value[i].Parent,
           timestamp: value[i].Timestamp,
         };
      }
      allvars = allvars.sort(comparevar);
      for (var i = 0; i < allvars.length; i++) {
         allchildren[i] = [];
         for (var j = 0; j < value.length; j++) {
            if (value[j].Variablename == allvars[i].label) {
               if(value[j].Parent==null) {
                 allparents[i]= "";
               } else {
                 allparents[i] = value[j].Parent;
               }
            }
            if (value[j].Parent == allvars[i].label) {
              if(value[j].Variablename==null) {
                
              } else {
               allchildren[i].push(value[j].Variablename); 
              }
            }
         }
      }

      /*
      const varselects = ["dependent-variable", "independent-variable", "instrumental-variable", "parent-variable"];
    for (var i = 0; i < varselects.length; i++) {
      updateSelector(varselects[i], allvars)
    }
    */
   });
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


function updateSelector(id, varset) {
   const selects = document.querySelectorAll('select');
   selects.forEach(select => {
      if (select.id == id) {
         const selectedOption = select.value;
         while (select.firstChild) select.removeChild(select.firstChild);
         select.append(new Option());

         varset.forEach(variable => {
            const option = new Option(variable, variable);
            if (variable === selectedOption) option.selected = true;
            select.append(option);
         });
      }
   });
}

function updateAllVars() {
   fetchAllVars();
}

submitClaim = function () {
   var submissionurl = "https://docs.google.com/forms/d/e/1FAIpQLSdXgItq-zrA7Do6vOAuJmtd_nDqYFoZ3l8ypO4EQ0fUoLWA_w/viewform?usp=pp_url&entry.1535032722=" + claim.doi +
      "&entry.1128171251=" + claim.xvar +
      "&entry.860119781=" + claim.yvar +
      "&entry.1916574635=" + claim.instrument +
      "&entry.1972506017=" + claim.startyear + 
      "&entry.470269037=" + claim.endyear + 
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
   newvar = {
      name: "",
      parentvar: "",
      vardescription: ""
   };
   varname.value = "";
   parentvar.value = "";
   vardescription.value = ""
}

updateVarSubmission = function () {
   newvar.name = varname.value;
   newvar.parentvar = parentvar.value
   newvar.vardescription = vardescription.value;
}


submitVarClaim = function () {
  updateVarSubmission();
  if(allVarInclude(newvar.name)) {
    // variable already exists
  } else {
    if(backend=="gs") {
      var submissionurl = "https://docs.google.com/forms/d/e/1FAIpQLScWFrxRU7VDtPnKe857jBIPCYFRBNftoICGAUT5xPMuwIJFVA/viewform?usp=pp_url&entry.775303211=" +
      newvar.name +
      "&entry.1554052921=" + newvar.parentvar +
      "&entry.1513559511=" + newvar.vardescription;

     document.getElementById("varoverlay").style.display = "block";
     window.open(submissionurl, '_blank');    
    }
   if(backend=="dolthub") {
     var test = fetch("https://lastakeholders.jonathanmellon.com/api/submitclaim", {
        method: "POST",
          body: JSON.stringify({
          label: newvar.name,
          parent: "6df77ebd-f239-4329-a190-51ec99b424af",
          description: newvar.vardescription
  }),
  headers: {
    "Content-type": "application/json; charset=UTF-8"
  }
});
   }
   
   
   
  }
   
}

updateClaimSubmission = function () {
  try{
    claim.doi = doicurrent.value;
  } catch(e) {
    
  }
  try{
    claim.xvar = indvar.value;
  } catch(e) {
    
  }
  try{
    claim.yvar = depvar.value;
  } catch(e) {
    
  }
  try{
    claim.instrument = instrvar.value;
  } catch(e) {
    
  }
  try{
    claim.finding = finding.value;
  } catch(e) {
    
  }
  try{
    claim.identification = identification.value;
  } catch(e) {
    
  }
  try{
    claim.uoa = uoa.value;
  } catch(e) {
    
  }
  try{
   claim.startyear = startyr.value;
  } catch(e) {
    
  }
  try{
   claim.endyear = endyr.value;
  } catch(e) {
    
  }
   
   
   try{
   let countrystring = "";
   for (var i = 0; i < countries.selectedOptions.length; i++) {
      if (countrystring == "") {
         countrystring = countries.selectedOptions[i].value
      } else {
         countrystring = countrystring + ";" + countries.selectedOptions[i].value;
      }
   }  
   }catch(e) {
     
   }
  try{
   claim.countries = countrystring;
  } catch(e) {
    
  }
  try{
   claim.subpop = subpop.value;
  } catch(e) {
    
  }
  
  try{
   claim.n = nobs.value;
  } catch(e) {
    
  }
  try{
   claim.resultdoc = resultdoc.value;
  } catch(e) {
    
  }
  try{
   claim.submitter = submitter.value;
  } catch(e) {
    
  }
}


getCausalSheet = function () {

   parser.parse().then((items) => {
      for (var i = 0; i < items.length; i++) {
         sheetout[i] = items[i];
      }
   })
}

unselectAllCountries = function () {
   for (var i = 0; i < countries.options.length; i++) {
      countries.options[i].selected = false;
   }
}

selectCountry = function (set) {
   var countryset = [];
   if (set == "NATO") {
      countryset = [
         "BE", // Belgium
         "BG", // Bulgaria
         "CA", // Canada
         "HR", // Croatia
         "CZ", // Czech Republic
         "DK", // Denmark
         "EE", // Estonia
         "FR", // France
         "DE", // Germany
         "GR", // Greece
         "HU", // Hungary
         "IS", // Iceland
         "IT", // Italy
         "LV", // Latvia
         "LT", // Lithuania
         "LU", // Luxembourg
         "NL", // Netherlands
         "NO", // Norway
         "PL", // Poland
         "PT", // Portugal
         "RO", // Romania
         "SK", // Slovakia
         "SI", // Slovenia
         "ES", // Spain
         "TR", // Turkey
         "GB", // United Kingdom
         "US", // United States
      ];
   }
   if (set == "EU") {
      countryset = [
         "AT", // Austria
         "BE", // Belgium
         "BG", // Bulgaria
         "HR", // Croatia
         "CY", // Cyprus
         "CZ", // Czech Republic
         "DK", // Denmark
         "EE", // Estonia
         "FI", // Finland
         "FR", // France
         "DE", // Germany
         "GR", // Greece
         "HU", // Hungary
         "IE", // Ireland
         "IT", // Italy
         "LV", // Latvia
         "LT", // Lithuania
         "LU", // Luxembourg
         "MT", // Malta
         "NL", // Netherlands
         "PL", // Poland
         "PT", // Portugal
         "RO", // Romania
         "SK", // Slovakia
         "SI", // Slovenia
         "ES", // Spain
         "SE", // Sweden
      ];
   }
   if (set == "OECD") {
      countryset = [
         "AU", // Australia
         "AT", // Austria
         "BE", // Belgium
         "CA", // Canada
         "CL", // Chile
         "CZ", // Czech Republic
         "DK", // Denmark
         "EE", // Estonia
         "FI", // Finland
         "FR", // France
         "DE", // Germany
         "GR", // Greece
         "HU", // Hungary
         "IS", // Iceland
         "IE", // Ireland
         "IL", // Israel
         "IT", // Italy
         "JP", // Japan
         "KR", // South Korea
         "LV", // Latvia
         "LT", // Lithuania
         "LU", // Luxembourg
         "MX", // Mexico
         "NL", // Netherlands
         "NZ", // New Zealand
         "NO", // Norway
         "PL", // Poland
         "PT", // Portugal
         "SK", // Slovakia
         "SI", // Slovenia
         "ES", // Spain
         "SE", // Sweden
         "CH", // Switzerland
         "TR", // Turkey
         "GB", // United Kingdom
         "US", // United States
      ];
   }

   if (set == "lowinc") {
      countryset = [
         "AF", "BI", "BF", "CF", "CD", "ER", "ET", "GM", "GW", "LR",
         "MG", "ML", "MZ", "MW", "NE", "KP", "RW", "SD", "SL", "SO",
         "SS", "SY", "TD", "TG", "UG", "YE"
      ];
   }
   if (set == "lowmidinc") {
      countryset = [
         "AO", "BJ", "BD", "BO", "BT", "CI", "CM", "CG", "KM", "CV",
         "DJ", "DZ", "EG", "FM", "GH", "GN", "HN", "HT", "IN", "IR",
         "JO", "KE", "KG", "KH", "KI", "LA", "LB", "LK", "LS", "MA",
         "MM", "MN", "MR", "NG", "NI", "NP", "PK", "PH", "PG", "SN",
         "SB", "ST", "SZ", "TJ", "TL", "TN", "TZ", "UA", "UZ", "VN",
         "VU", "WS", "ZM", "ZW"
      ];
   }
   if (set == "highmidinc") {
      countryset = [
         "AL", "AR", "AM", "AZ", "BG", "BA", "BY", "BZ", "BR", "BW",
         "CN", "CO", "CR", "CU", "DM", "DO", "EC", "FJ", "GA", "GE",
         "GQ", "GD", "GT", "ID", "IQ", "JM", "KZ", "LY", "LC", "MD",
         "MV", "MX", "MH", "MK", "ME", "MU", "MY", "NA", "PE", "PW",
         "PY", "PS", "RU", "SV", "RS", "SR", "TH", "TM", "TO", "TR",
         "TV", "VC", "XK", "ZA"
      ];
   }

   if (set == "highinc") {
      countryset = [
         "AW", "AD", "AE", "AS", "AG", "AU", "AT", "BE", "BH", "BS",
         "BM", "BB", "BN", "CA", "CH", "JE", "CL", "CW", "KY", "CY",
         "CZ", "DE", "DK", "ES", "EE", "FI", "FR", "FO", "GB", "GI",
         "GR", "GL", "GU", "GY", "HK", "HR", "HU", "IM", "IE", "IS",
         "IL", "IT", "JP", "KN", "KR", "KW", "LI", "LT", "LU", "LV",
         "MO", "MF", "MC", "MT", "MP", "NC", "NL", "NO", "NR", "NZ",
         "OM", "PA", "PL", "PR", "PT", "PF", "QA", "RO", "SA", "SG",
         "SM", "SK", "SI", "SE", "SX", "SC", "TC", "TT", "TW", "UY",
         "US", "VG", "VI"
      ];

   }
   for (var i = 0; i < countries.options.length; i++) {
      if (countryset.includes(countries.options[i].value)) {
         countries.options[i].selected = true;
      }
   }

}