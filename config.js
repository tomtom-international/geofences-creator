var apiKey = "";
var geofencingAdminKey = "";
var geofencingProjectId = "";

function invalidJsonErrorMsg() { return "Error while parsing JSON properties.\nExample input:\n{'key': 'value',\n'key2': 'value2'}"; }
function saveFenceErrorMsg(err) { return`There was an error while saving the fence: ${err.response.data.message}`; }
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