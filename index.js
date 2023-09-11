require("dotenv").config()
let {mwn} = require("mwn")
function wikitext_generator(parsed){
    let str = ""
    for(let [lang, title] of Object.entries(parsed)){
        str += "[[" + lang + ":" + title + "]]" + "\n"
    }
    let ret = {}
    ret["str"] = str
    ret["data"] = parsed
    return ret
}
function parse_url(url){
    let data = {}
    let splitter = 0

    splitter = url.indexOf("/wiki/") + 6
    let page_hex = url.slice(splitter, url.length)
    let page_str = ""
    for(let i = 0; i < page_hex.length; i++){
        if(page_hex[i] === "%"){
            page_str += String.fromCharCode(parseInt(page_hex[i+1] + page_hex[i+2], 16))
            i += 2
        }
        else{
            page_str += page_hex[i]
        }
    }
    data["page"] = page_hex
    url = url.slice(0, splitter - 6)
    if (url.lastIndexOf("/") > 7){
        data["lang"] = url.slice(url.lastIndexOf("/") + 1, url.lastIndexOf("/") + 3)
        data["api"] = url + "/api.php"
    }
    else{
        data["lang"] = "en"
        data["api"] = url + "/api.php"
    }
//api, page, lang
    return data
}
async function fetch_data(buff){
    let ret = {}
    let api = buff["api"]
    let settings = {
        action: "parse",
        page: buff["page"],
        prop: "langlinks",
        format: "json"
    }
    let url = api + "?"
    Object.entries(settings).forEach(value => {url += value[0] + "=" + value[1] + "&"})

    let links = []
    let data = []
    data = await fetch(url).then(response => {
        return response.json()
    })
    ret["links"] = []

    if(data !== null && data.error == null) {
        ret["title"] = data.parse.title
        ret["links"] = data.parse.langlinks
    }

    return ret
}
async function scan(url) {
    let parsed = {}
    let query = []
    let done = []
    let promises = []
    query.push(url)
    while(query.length > 0){
        let data = []
        for(let i of query){
            let buff  = parse_url(i)
            done.push(buff.lang)
            promises.push(fetch_data(buff).then(a => {
                if(typeof a["title"] != 'undefined') {
                    parsed[buff.lang] = a["title"]
                }
                data.push(a["links"])
            }))

        }
        await Promise.all(promises)
        query = []
        data = data.flat()
        console.log(data)
        data.forEach(i => {
            if(!(done.includes(i.lang))){
                query.push(i.url)
            }
        })
        data = []
        promises = []
    }
    return wikitext_generator(parsed)
}


async function main(){
    let data = await scan(process.env.START_URL)
    console.log(data)
    let end_data = parse_url(process.env.END_URL)
    console.log(end_data)
    return
    let bot = await mwn.init({
        apiUrl: end_data["api"],
        username: process.env.BOT_USERNAME,
        password: process.env.BOT_PASSWORD,
        defaultParams: {
            assert: 'user' // ensure we're logged in
        }
    })

    await bot.edit(end_data["page"], (rev) => {
        let text = rev.content + "\n" + data["str"]
        return {
            text: text,
            summary: 'interwiki',
            minor: true
        };
    })
}


main()
//fetch("https://terraria.fandom.com/api.php?action=parse&page=Hardmode&prop=langlinks&format=json&").then(data =>  {return data.json()}).then(data => {console.log(data)})
//https://dead-cells.fandom.com/ru/api.php?action=query&titles=%D0%A0%D1%83%D0%BD%D1%8B&prop=langlinks&format=json