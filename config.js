let apiKey = "";
let geofencingAdminKey = "";
let geofencingProjectId = "";

const circleCenterHint = "Click on a map to select center point.";
const circleRadiusHint = "Click on a map to set circle radius.";
const firstVertexHint = "Click on a map to select first vertex.";
const rectSecondVertexHint = "Click on a map to select opposite vertex.";
const polyNextVertexHint = "Click on a map to select next vertex. Double click to end drawing.";
const corridorFirstPointHint = "Click on a map to select starting point.";
const corridorNextPointHint = "Click on a map to select next point. Double click to end drawing.";

function invalidJsonErrorMsg() { return `Error while parsing JSON properties.\nExample input:\n{"key": "abc",\n'key2': 2}`; }
function saveFenceErrorMsg(err) { return `There was an error while saving the fence: ${err.response.data.message}`; }
function createProjectErrorMsg(err) { return `There was an error while creating a new project: ${err.response.data}`; }
function retrieveProjectsErrorMsg(err) { return `There was an error while retrieving project list: ${(err.response.data == "<h1>Developer Inactive</h1>" ? "Check your API key" : err.response.data)}`; }
function generateAdminKeyErrosMsg(err) {
    if (err.message == "Network Error") {
        return "Network error. Check your API key.";
    }
    else {
        return `There was an error while registering your Admin Key: ${err.response.data.message}`;
    }
}
function fetchFencesErrorMsg(err) { return `There was an error while fetching fences: ${err.response.data}`; }
function fetchFenceErrorMsg(err) { return `There was an error while fetching fence: ${err.response.data}`; }
function deleteFenceErrorMsg(err) { return `There was an error while deleting fence: ${err.response.data.message}`; }