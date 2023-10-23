var page = "adder";
var doicurrent = document.getElementById("DOI");
var indvar = document.getElementById("independent-variable");
var depvar = document.getElementById("dependent-variable");
var instrvar = document.getElementById("instrumental-variable");
var finding = document.getElementById("finding");
var identification = document.getElementById("identification");
var uoa = document.getElementById("uoa");
var countries = document.getElementById("countries");
var subpop = document.getElementById("subpop");
var nobs = document.getElementById("nobs");
var resultdoc = document.getElementById("tabloc");
var submitter = document.getElementById("yourname");

var startyr = document.getElementById("startyear");
var endyr = document.getElementById("endyear");

var varname = document.getElementById("variable-name");
var parentvar = document.getElementById("parent-variable");
var vardescription = document.getElementById("description");
var citations2 = [];

document.getElementById("confirm").addEventListener("click", function() {
    location.reload();
});

document.getElementById("resubmit").addEventListener("click", function() {
    submitClaim();
});

document.getElementById("cancel").addEventListener("click", function() {
    document.getElementById("overlay").style.display = "none";
});




document.getElementById("cancelvar").addEventListener("click", function() {
    document.getElementById("varoverlay").style.display = "none";
});

document.getElementById("cancelvardolt").addEventListener("click", function() {
    document.getElementById("varoverlaydolthub").style.display = "none";
});

document.getElementById("confirmvar").addEventListener("click", function() {
    document.getElementById("varoverlay").style.display = "none";
    fetchAllVars();
    resetVarSubmission();
});

document.getElementById("continuevar").addEventListener("click", function() {
    document.getElementById("varoverlaydolthub").style.display = "none";
    fetchAllVars();
    resetVarSubmission();
});

document.getElementById("resubmitvar").addEventListener("click", function() {
    submitVarClaim();
});

document.getElementById("resubmitvardolt").addEventListener("click", function() {
    submitVarClaim();
});

const pubtext = document.getElementById('pubdetails');
getDoltStudies();
fetchAllVars();
fetchAllStudies();
fetchFindingOpts();
fetchIdentStrats();
fetchUOA();

var indvarautomatch = new autoComplete({
    selector: '#independent-variable',
    minChars: 1,
    source: matcher
});
var depvarautomatch = new autoComplete({
    selector: '#dependent-variable',
    minChars: 1,
    source: matcher
});

var instrvarautomatch = new autoComplete({
    selector: '#instrumental-variable',
    minChars: 1,
    source: matcher
});
var parentvarautomatch = new autoComplete({
    selector: '#parent-variable',
    minChars: 1,
    source: matcher
});