let viz
let driver
let username, password
let updateHandler
let selectorsID = ["relationshipEnd", "relationshipStart",
    "nodeSelect", "oneWayFilterSelector", "depthFilterSelector"]
let topicsID = ["newTopic", "topic"]
let serverUrl = "bolt://localhost:7687"
let initialCypher = "MATCH (a) , ()-[r]-() RETURN a, r"
// будет хранить в реляционной БД
let communities = []

function getGraphInfo() {
    getLoginInfo()
    neo4jLogin()
    updateMenu()
    draw()
    updateGraph()
}

function updateGraph(reloadNeeded = false) {
    let session = driver.session()
    session
        .run(initialCypher)
        .then(result => {
            if (result.records.length === 0) {
                console.log("yes")
                viz.updateWithCypher("MATCH (a) RETURN a")

            }
            else
                viz.updateWithCypher(initialCypher)
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => {
            if (reloadNeeded)
                viz.reload()
            session.close()
        })
}

//!!! Костыль ([:subsection*0..100]) не показывает деревья с больше чем 100 этажей
function addOneWayFilter() {
    viz.updateWithCypher("MATCH p = ({id:" + document.getElementById("oneWayFilterSelector").value
        + "})-[:subsection*0..100]->()  RETURN p")
}

function showOneWayFilter() {
    viz.renderWithCypher("MATCH p = ({id:" + document.getElementById("oneWayFilterSelector").value
        + "})-[:subsection*0..100]->()  RETURN p")
}

function addDepthFilter() {
    let depth = parseInt(document.getElementById("depth").value)
    if (isNaN(depth)) {
        alert("Глубина должна быть указана целым числом больше нуля")
        return
    }

    for (let i = depth; i >= 0; i--){
        viz.updateWithCypher("MATCH p = ({id:" + document.getElementById("depthFilterSelector").value
            + "})-[:subsection*" + i + "]-()  RETURN p")
    }
}

function showDepthFilter() {
    let depth = parseInt(document.getElementById("depth").value)
    if (isNaN(depth)) {
        alert("Глубина должна быть указана целым числом больше нуля")
        return
    }
    viz.clearNetwork()
    for (let i = depth; i >= 0; i--){
        viz.updateWithCypher("MATCH p = ({id:" + document.getElementById("depthFilterSelector").value
            + "})-[:subsection*" + i + "]-()  RETURN p")
    }
}

function searchNodeByName() {
    let input = document.getElementById("nodeSearch").value.toLowerCase().trim()
    let list = document.getElementById("dropDownUL")
    while (list.hasChildNodes()) {
        list.removeChild(list.firstChild);
    }
    if (input === ""){return}

    let nodeSelector = document.getElementById("nodeSelect")
    for (let i = 0; i < nodeSelector.options.length; i++){
        if (nodeSelector.options[i].text.toLowerCase().indexOf(input) >= 0){
            console.log(input + " : " + nodeSelector.options[i].text.toLowerCase())
            let li = document.createElement("li")
            li.value = nodeSelector.options[i].value
            li.onclick = (event) => {
                let selectedNodeId = event.target.closest("li").value
                let nodeSelector = document.getElementById("nodeSelect")
                for (let i = 0; i < nodeSelector.options.length; i++){
                    if (nodeSelector.options[i].value == selectedNodeId){
                        nodeSelector.selectedIndex = i
                        getSelectedNodeInfo()
                        return
                    }
                }
            }

            let a = document.createElement("a")
            a.text = nodeSelector.options[i].text

            li.appendChild(a)
            list.appendChild(li)
        }
    }
}

function draw() {
    let config = {
        container_id: "viz",
        server_url: serverUrl,
        server_user: username,
        server_password: password,
        labels: {
            "Node": {
                caption: "title",
                size: "size",
                community: "topicNumber"
            }
        },
        relationships: {
            "subsection": {
                caption: "type",
                thickness: "thickness",
                title_properties: false
            }
        },
        arrows: true,
        initial_cypher: initialCypher
    }

    viz = new NeoVis.default(config)
    console.log(viz)
    viz.render()
}

async function neo4jLogin() {
    driver = neo4j.driver(serverUrl, neo4j.auth.basic(username, password), {encrypted: 'ENCRYPTION_OFF'})
    driver.onError = error => {
        console.log(error)
    }

    try {
        await driver.verifyConnectivity()
    } catch (error) {
        alert("Ошибка аутентификации")
    }
    session = driver.session()
}

function getLoginInfo() {
    const menu = document.forms.graphMenu
    serverUrl = document.getElementById("url").value
    username = menu.elements.username.value
    password = menu.elements.password.value
}

function addNode() {
    let availableId = 0
    var idSession = driver.session()
    idSession
        .run("MATCH (p) RETURN p.id ORDER BY p.id DESC LIMIT 1")
        .then(result => {
            result.records.forEach(record => {
                availableId = 1 + parseInt(record.get("p.id"))
            })
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => {
            idSession.close()
        })
        .then(() => {
            var createSession = driver.session()
            let topic = document.getElementById("newTopic").value
            if (topic === "Создать новую тему") {
                topic = document.getElementById("newTitle").value
                communities.push(topic)
            }
            createSession
                .run("CREATE (a" + availableId + ":Node {title: \"" + document.getElementById("newTitle").value +
                    "\", topic:\"" + topic +
                    "\", topicNumber:" + communities.indexOf(topic) +
                    ", description:\"" + document.getElementById("newDesc").value +
                    "\", use: [\" " + document.getElementById("newUse").value.split(",").join("\" , \"") + 
                    " \"], id:" + availableId + 
                    ", size:" + parseFloat(document.getElementById("newType").value) + "})")
                .then(() => {
                })
                .catch(error => {
                    console.log(error)
                })
                .then(() => {
                    createSession.close()
                    updateGraph()
                    updateMenu()
                })
        })
}

function changeNode() {
    var setSession = driver.session()
    setSession
        .run(
            "MATCH (p:Node {id:" + document.getElementById("nodeSelect").value + "})" +
            " SET p.title = \"" + document.getElementById("title").value + "\"" +
            " SET p.description = \"" + document.getElementById("desc").value + "\"" +
            " SET p.use = [\"" + document.getElementById("use").value.split(",").join("\" , \"") + "\"]" +
            " SET p.size = " + parseFloat(document.getElementById("type").value)
        )
        .then(result => {
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => {
            setSession.close()
            updateGraph()
            updateMenu()
        })
}

function removeNode() {
    var session = driver.session()
    session
        .run("MATCH (p) WHERE p.id =" + document.getElementById("nodeSelect").value + " DETACH DELETE p")
        .then(result => {
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => {
            session.close()
            updateGraph(true)
            updateMenu()
        })
}

function updateMenu() {
    for (let i = 0; i < selectorsID.length; i++)
        clearSelect(selectorsID[i])
    for (let i = 0; i < topicsID.length; i++)
        clearSelect(topicsID[i])
    let text = "Создать новую тему"
    document.getElementById("newTitle").value = ""
    document.getElementById("newDesc").value = ""
    document.getElementById("newUse").value = ""
    document.getElementById("newTopic").add(new Option(text, text, false, false))
    getTopics()
    getNodes()
}

function clearSelect(selectID) {
    for (let i = document.getElementById(selectID).options.length - 1; i >= 0; i--)
        document.getElementById(selectID).options[i] = null
}

function addRelationship() {
    let startNodeId = document.getElementById("relationshipStart").value
    let endNodeId = document.getElementById("relationshipEnd").value
    let relationshipType = document.getElementById("relationshipType").value
    var session = driver.session()
    session
        .run(`MATCH (a) , (b) WHERE a.id = ${startNodeId} AND b.id = ${endNodeId}  CREATE (a)-[:subsection {type: "${relationshipType}"}]->(b)`)
        .then(result => {
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => {
            session.close()
            updateGraph()
        })

}

function removeRelationship() {
    let startNodeId = document.getElementById("relationshipStart").value
    let endNodeId = document.getElementById("relationshipEnd").value
    var session = driver.session()
    session
        .run("MATCH (a {id:" + startNodeId + "})-[r:subsection]->(b {id:" + endNodeId + "}) DELETE r")
        .then(result => {
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => {
            session.close()
            updateGraph(true)
        })
}

function getTopics() {
    var session = driver.session()
    session
        .run("MATCH (p) WHERE p.topic IS NOT NULL RETURN DISTINCT p.topic")
        .then(result => {
            result.records.forEach(record => {
                for (let i = 0; i < topicsID.length; i++)
                    document.getElementById(topicsID[i]).add(new Option("<" + record.get("p.topic") + ">", record.get("p.topic"), false, false))
            })
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => {
            session.close()
        })
}

function getNodes() {
    var session = driver.session()
    session
        .run("MATCH (p) RETURN p.id, p.title ORDER BY p.id")
        .then(result => {
            result.records.forEach(record => {
                let text = "<" + record.get("p.id") + ">:" + record.get("p.title")
                for (let i = 0; i < selectorsID.length; i++)
                    document.getElementById(selectorsID[i]).add(new Option(text, record.get("p.id"), false, false))
            })
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => {
            var subSession = driver.session()
            subSession
                .run("MATCH (p) RETURN DISTINCT p.topic, p.topicNumber")
                .then(result => {
                    result.records.forEach(record => {
                        communities[record._fields[1]] = (record._fields[0])
                    })
                })
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => {
            session.close()
            getSelectedNodeInfo()
        })
}

function getSelectedNodeInfo() {
    var session = driver.session()
    let id = document.getElementById("nodeSelect").value
    if (id === "") return
    session
        .run("MATCH (p {id: " + id + "}) RETURN p.description, p.use, p.title, p.topic, p.size LIMIT 1")
        .then(result => {
            result.records.forEach(record => {
                document.getElementById("desc").value = record.get("p.description")
                document.getElementById("title").value = record.get("p.title")
                document.getElementById("topic").value = record.get("p.topic")
                document.getElementById("use").value = record.get("p.use").join(", ")

                let size = record.get("p.size")
                let sizeOptions = document.getElementById("type").options
                for (let i = 0; i < sizeOptions.length; i++) {
                    if (size == sizeOptions[i].value) {
                        document.getElementById("type").selectedIndex = i
                        break
                    }
                }
            })
        })
        .catch(error => {
            console.log(error)
        })
        .then(() => session.close())
}
