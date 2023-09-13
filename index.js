async function responseByParams(api, params){
    let request = api + "?"
    Object.entries(params).forEach(value => {request += value[0]+"="+value[1]+"&"})
    return await fetch(request).then(data => {
        return data.json()
    }).catch(err => {
        console.log(err);
        return {}
    })
}

class URL{
    api
    lang
    title
    constructor() {
        this.api = ""
        this.lang = ""
        this.title = ""
    }
    async get_links(){
        let params = {
            action: "parse",
            prop: "langlinks",
            page: this.title,
            format: "json"
        }
        let links
        let promises = []
        let response = await responseByParams(this.api, params)
        if(!(Object.keys(response).length === 0 || response.error !== undefined)){
            response.parse.langlinks.forEach(async value => {
                promises.push(URL.init(value["url"]))
            })
        }
        links = await Promise.all(promises)
        return links
    }
    static async init(url){
        url = decodeURI(url)
        if (url.includes("gamepedia.com")){
            url = await fetch(url).then(data => {return data.url})
        }
        let instance = new URL()
        let domain = url.slice(0, url.indexOf("/", 8))
        url = url.slice(url.indexOf("/", 8) + 1, url.length)
        if (url.indexOf("wiki") === 0){
            instance.lang = "en"
            instance.api = domain + "/api.php"
        }
        else{
            instance.lang = url.slice(0, 2)
            instance.api = domain + "/" + instance.lang + "/api.php"
            url = url.slice(3, url.length)
        }
        instance.title = url.slice(5, url.length)

        return instance
    }
}

class InterwikiMap{
    map
    done
    query
    constructor() {
        this.map = {}
        this.done = [];
        this.query = [];
    }
    static async init(start_url){
        let instance = new InterwikiMap()
        instance.query.push(await URL.init(start_url))
        let promises = []
        while (instance.query.length > 0){
            for(let url of instance.query){
                promises.push(url.get_links())
            }
            let links = (await Promise.all(promises)).flat()

            instance.query = []
            for(let link of links){
                if (!instance.done.includes(link.lang)){
                    instance.query.push(link)
                    instance.map[link.lang] = link.title
                    instance.done.push(link.lang)
                }
            }
        }
        return instance
    }
}
