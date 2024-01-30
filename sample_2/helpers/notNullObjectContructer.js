module.exports = (obj) => {
    let ob = {}
    for (key in obj) {
        if (obj[key]) {
            ob[key] = obj[key]
        }
    }
    return JSON.stringify(ob)
}
