const global = {
    log: 1, //日志模式:0不显示 1全部显示 2精简显示,推荐值:1
    parallel: false, //是否顺序签到(true则同时签到,可能会出现内存占用过高导致执行失败的情况;false则签到速度会慢一些,但是很稳)
    sign: { //用于设置哪些需要进行签到,哪些不处理
        netease_music: true,
        china_telecom: true,
    },
    data: {
        china_telecom: "19983491998" //此处输入要签到的手机号码,半角双引号中间
    }
}

//#region smartjs,用于兼容Surge和QuantumultX

/*
 本作品用于QuantumultX和Surge之间js执行方法的转换
 您只需书写其中任一软件的js,然后在您的js最【前面】追加上此段js即可
 无需担心影响执行问题,具体原理是将QX和Surge的方法转换为互相可调用的方法
 尚未测试是否支持import的方式进行使用,因此暂未export
 如有问题或您有更好的改进方案,请前往 https://github.com/sazs34/TaskConfig/issues 提交内容,或直接进行pull request
 您也可直接在tg中联系@wechatu
 */
// #region 固定头部
let isQuantumultX = typeof $task != 'undefined'; //判断当前运行环境是否是qx
let isSurge = typeof $httpClient != 'undefined'; //判断当前运行环境是否是surge
let isRequest = typeof $request != "undefined"; //判断是否是请求
// http请求
var $task = isQuantumultX ? $task : {};
var $httpClient = isSurge ? $httpClient : {};
// cookie读写
var $prefs = isQuantumultX ? $prefs : {};
var $persistentStore = isSurge ? $persistentStore : {};
// 消息通知
var $notify = isQuantumultX ? $notify : {};
var $notification = isSurge ? $notification : {};


var done = (value = {}) => isQuantumultX ? (isRequest ? $done(value) : null) : ((isRequest ? $done(value) : $done()));
// #endregion 固定头部

// #region 网络请求专用转换
if (isQuantumultX) {
    var errorInfo = {
        error: ''
    };
    $httpClient = {
        get: (url, cb) => {
            var urlObj;
            if (typeof (url) == 'string') {
                urlObj = {
                    url: url
                }
            } else {
                urlObj = url;
            }
            $task.fetch(urlObj).then(response => {
                cb(undefined, response, response.body)
            }, reason => {
                errorInfo.error = reason.error;
                cb(errorInfo, response, '')
            })
        },
        post: (url, cb) => {
            var urlObj;
            if (typeof (url) == 'string') {
                urlObj = {
                    url: url
                }
            } else {
                urlObj = url;
            }
            url.method = 'POST';
            $task.fetch(urlObj).then(response => {
                cb(undefined, response, response.body)
            }, reason => {
                errorInfo.error = reason.error;
                cb(errorInfo, response, '')
            })
        }
    }
}
if (isSurge) {
    $task = {
        fetch: url => {
            //为了兼容qx中fetch的写法,所以永不reject
            return new Promise((resolve, reject) => {
                if (url.method == 'POST') {
                    $httpClient.post(url, (error, response, data) => {
                        if (response) {
                            response.body = data;
                            resolve(response, {
                                error: error
                            });
                        } else {
                            resolve(null, {
                                error: error
                            })
                        }
                    })
                } else {
                    $httpClient.get(url, (error, response, data) => {
                        if (response) {
                            response.body = data;
                            resolve(response, {
                                error: error
                            });
                        } else {
                            resolve(null, {
                                error: error
                            })
                        }
                    })
                }
            })
            
        }
    }
}
// #endregion 网络请求专用转换

// #region cookie操作
if (isQuantumultX) {
    $persistentStore = {
        read: key => {
            return $prefs.valueForKey(key);
        },
        write: (val, key) => {
            return $prefs.setValueForKey(val, key);
        }
    }
}
if (isSurge) {
    $prefs = {
        valueForKey: key => {
            return $persistentStore.read(key);
        },
        setValueForKey: (val, key) => {
            return $persistentStore.write(val, key);
        }
    }
}
// #endregion

// #region 消息通知
//#endregion

//#endregion

let master = () => {
    if (typeof $request != "undefined") {
        getCookie();
    } else {
        execute();
    }
}

let getCookie = () => {
    //#region 基础配置
    const config = {
        netease_music: {
            cookie: 'CookieWY',
            name: '网易云音乐Cookie',
            Host: 'music.163.com'
        },
        jd: {
            cookie: 'CookieJD',
            name: '京东Cookie',
            Host: 'api.m.jd.com'
        },
        china_telecom: {
            cookie: 'cookie.10000',
            name: '电信营业厅',
            Host: 'wapside.189.cn'
        },
    }
    //#endregion
    
    //#region 查重方法,用于检测Cookie值是否发生变化以便于更新Cookie
    
    let updateCookie = (config, newVal) => {
        if (!newVal || !config) return;
        var historyCookie = $prefs.valueForKey(config.cookie);
        if (historyCookie) {
            if (historyCookie != newVal) {
                if ($prefs.setValueForKey(newVal, config.cookie)) {
                    $notify(`更新 ${config.name} 成功🎉`, "", "无需禁用脚本，仅Cookie改变时才会重新获取");
                } else {
                    $notify(`更新 ${config.name} 失败!!!`, "", "");
                }
            } else {
                //cookie未发生变化,不执行更新
            }
        } else {
            if ($prefs.setValueForKey(newVal, config.cookie)) {
                $notify(`首次写入 ${config.name} 成功🎉`, "", "无需禁用脚本，仅Cookie改变时才会重新获取");
            } else {
                $notify(`首次写入 ${config.name} 失败!!!`, "", "");
            }
        }
    }
    
    //#endregion
    
    //#region 正式开始写入cookie
    let request = $request;
    var isValidRequest = request && request.headers && request.headers.Cookie
    if (isValidRequest) {
        let headers = request.headers;
        // console.log(`【Cookie触发】${headers.Host}-${headers.Cookie}`)
        //#region 网易云音乐
        if (headers.Host == config.netease_music.Host) {
            var headerCookie = headers.Cookie;
            //这个cookie很调皮,会将WM_TID放置到最前面一次,导致cookie会检测到变化,实际值始终是一样的
            if (headerCookie.indexOf("WM_TID=") > 0)
                updateCookie(config.netease_music, headerCookie);
        }
        //#endregion
        //#region 京东
        if (headers.Host == config.jd.Host) {
            var headerCookie = headers.Cookie;
            updateCookie(config.jd, headerCookie);
        }
        //#endregion
        //#region 中国电信
        if (headers.Host.indexOf(config.china_telecom.Host) >= 0) {
            var headerCookie = headers.Cookie;
            updateCookie(config.china_telecom, headerCookie);
        }
        //#endregion
    }
    $done();
    
    //#endregion
    
}

let execute = () => {
    //#region 签到配置,请勿修改
    const config = {
        netease_music: {
            cookie: 'CookieWY',
            name: '网易云音乐',
            provider: {
                app: {
                    url: `http://music.163.com/api/point/dailyTask?type=0`,
                    headers: {
                        Cookie: ''
                    }
                },
                pc: {
                    url: `http://music.163.com/api/point/dailyTask?type=1`,
                    headers: {
                        Cookie: ''
                    }
                }
            },
            data: {
                app: '',
                pc: '',
                notify: ''
            }
        },
        china_telecom: {
            cookie: 'cookie.10000',
            name: '中国电信',
            provider: {
                url: 'https://wapside.189.cn:9001/api/home/sign',
                method: 'POST',
                headers: {
                    "Content-Type": `application/json;charset=utf-8`,
                    "User-Agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;CtClient;7.6.0;iOS;13.3;iPhone XR`,
                    "Host": `wapside.189.cn:9001`,
                    "Origin": `https://wapside.189.cn:9001`,
                    "Referer": `https://wapside.189.cn:9001/resources/dist/signInActivity.html?cmpid=jt-khd-my-zygn&ticket=0ab000281b4a8139f264620ae1d8b1ce067a6587921f90a6260dca4389a4e01a&version=7.6.0`,
                    Cookie: ''
                },
                body: JSON.stringify({
                    phone: global.data.china_telecom
                })
            },
            data: {
                notify: ''
            }
        },
    }
    //#endregion
    
    //#region 签到开始
    
    //#region 网易云音乐
    
    let sign_netease_music = () => {
        if (!global.sign.netease_music) {
            record(`[${config.netease_music.name}] 未开启签到`);
            return;
        }
        let cookieVal = $prefs.valueForKey(config.netease_music.cookie);
        if (!cookieVal) {
            config.netease_music.data.notify = `[${config.netease_music.name}] 未获取到Cookie`;
            record(config.netease_music.data.notify);
            finalNotify('netease_music');
            return;
        }
        let sign = (type) => {
            // record(`网易云-sign-${type}`)
            config.netease_music.provider[type].headers.Cookie = cookieVal;
            $task.fetch(config.netease_music.provider[type]).then(response => {
                let result = JSON.parse(response.body);
                combain(result, type);
            }, reason => {
                var signInfo = {};
                signInfo.code = 999;
                signInfo.msg = reason.error;
                combain(signInfo, type);
            });
        }
        let combain = (result, type) => {
            // record(`网易云-combain-${type}-${JSON.stringify(result)}`)
            try {
                if (result.code == 200) {
                    //success
                    config.netease_music.data[type] = '签到成功🎉';
                } else if (result.code == -2) {
                    //signed
                    config.netease_music.data[type] = '重复签到🎉';
                } else if (result.code == 301) {
                    //signed
                    config.netease_music.data[type] = 'Cookie失效⚠️';
                } else {
                    //failed
                    config.netease_music.data[type] = '未知错误⚠️';
                }
            } catch (e) {
                config.netease_music.data[type] = '未知错误见日志⚠️';
                record(`网易云报错-${JSON.stringify(e)}`);
            }
            checkIsAllProcessed();
        }
        let checkIsAllProcessed = () => {
            record(`[${config.netease_music.name}]-check-${config.netease_music.data.pc}-${config.netease_music.data.app}`)
            if (config.netease_music.data.pc && config.netease_music.data.app) {
                config.netease_music.data.notify = `[${config.netease_music.name}] APP-${config.netease_music.data.app} PC-${config.netease_music.data.pc}`;
                finalNotify('netease_music');
            }
        }
        
        sign('app');
        sign('pc');
    }
    
    //#endregion
    
    //#region 中国电信营业厅
    let sign_china_telecom = () => {
        if (!global.sign.china_telecom) {
            record(`[${config.china_telecom.name}]未开启签到`);
            return;
        }
        if (!global.data.china_telecom) {
            config.china_telecom.data.notify = `[${config.china_telecom.name}] 未配置对应的签到手机号`;
            record(config.china_telecom.data.notify);
            finalNotify("china_telecom");
            return;
        }
        let cookieVal = $prefs.valueForKey(config.china_telecom.cookie);
        if (!cookieVal) {
            config.china_telecom.data.notify = `[${config.china_telecom.name}] 未获取到Cookie⚠️`;
            record(`${config.china_telecom.data.notify}`);
            finalNotify("china_telecom");
            return;
        }
        config.china_telecom.provider.headers.Cookie = cookieVal;
        $task.fetch(config.china_telecom.provider).then(response => {
            try {
                var body = JSON.parse(response.body);
                if (body.resoultCode == "0") {
                    if (body.data.code == 1) {
                        config.china_telecom.data.notify = `[${config.china_telecom.name}] 签到成功,获得金币${body.data.coin}/金豆${body.data.flow}`;
                    } else if (body.data.code == 0) {
                        config.china_telecom.data.notify = `[${config.china_telecom.name}] 签到成功,${body.data.msg}`;
                    } else {
                        config.china_telecom.data.notify = `[${config.china_telecom.name}] ${body.data.msg}`;
                    }
                } else {
                    config.china_telecom.data.notify = `[${config.china_telecom.name}] 签到失败, ${body.data.msg}-${body.resoultCode}`;
                }
                record(config.china_telecom.data.notify)
            } catch (e) {
                config.china_telecom.data.notify = `[${config.china_telecom.name}] 签到失败-e`;
                record(`${config.china_telecom.data.notify}-error:${JSON.stringify(e)}`);
            }
            finalNotify("china_telecom");
        }, reason => {
            config.china_telecom.data.notify = `[${config.china_telecom.name}] 签到失败,${reason.error}`
            record(config.china_telecom.data.notify)
            finalNotify("china_telecom");
        })
    }
    //#endregion
    
    
    //#region 签到统一管控
    let startSign = () => {
        if (global.parallel) {
            if (global.sign.netease_music) sign_netease_music();
            if (global.sign.china_telecom) sign_china_telecom();
        } else {
            if (global.sign.netease_music) sign_netease_music();
            else if (global.sign.china_telecom) sign_china_telecom();
            else $notify("All In One", "详细签到信息可见日志", "暂无需签到的项目");
        }
    }
    
    let finalNotify = type => {
        config[type].executed = true;
        var notSignItem = "";
        for (var item in global.sign) {
            if (global.sign[item]) {
                if (!config[item].executed) {
                    notSignItem = item;
                    break;
                }
            }
        }
        if (notSignItem && !global.parallel) {
            record(`准备执行${notSignItem}`);
            eval(`sign_${notSignItem}()`);
            return;
        }
        let sign_detail = '';
        let breakLine = `
`;
        if (!notSignItem) {
            for (var item in global.sign) {
                // record(`提醒消息-${item}-${global.sign[item]}`)
                if (global.sign[item]) {
                    // record(`提醒消息-${config[item].data.notify}`)
                    sign_detail += `${sign_detail?breakLine:''}${config[item].data.notify}`;
                }
            }
            $notify("All In One", "详细签到信息可见日志", sign_detail);
        }
    }
    
    let record = content => {
        if (global.log == 1) {
            console.log(`
${content}`);
        } else if (global.log == 2) {
            console.log(`
${content.splice(0, 60)}`);
        }
    }
    //#endregion
    
    startSign();
}

let helper = {
    getCookieByName: (cookie, name) => {
        var reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
        var arr = cookie.match(reg);
        if (arr && arr.length >= 3)
            return arr[2];
        else
            return null;
    }
}

master();
