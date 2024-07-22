
const axios = require('axios');
const cheerio = require('cheerio');

// LINEBotのアクセストークンを設定
const LINE_ACCESS_TOKEN = ''
const USER_ID = '';

// -----------電車の遅延情報を取得する処理を記述-----------
async function getTrainDelayInfo() 
{
    const url = "https://transit.yahoo.co.jp/diainfo/area/6";
    try {
        const response = await axios.get(url);
        return response.data;
    } catch(error){
        console.error("電車の遅延情報の取得に失敗", error);
        return null;
    }
}

// -----------LINEBotにメッセージを送信する関数-----------
function sendLineMessage(message) 
{
    const url = 'https://api.line.me/v2/bot/message/push';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
    };
    const data = {
        to: 'USER_ID', // メッセージを送信するユーザーのID
        messages: [
            {
                type: 'text',
                text: message
            }
        ]
    };

    return axios.post(url, data, { headers: headers })
    .then(response => {
        console.log('メッセージ送信成功:', response.data);
    })
    .catch(error => {
        console.error('メッセージ送信失敗:', error);
    });
}

// メイン関数
async function main() 
{
    try {
      const userRouteList = ['阪急京都本線', 'JR京都線'];
      const troubleList = [];
      const srcHtml = await getTrainDelayInfo();
      
      if (!srcHtml) {
        console.error('電車の遅延情報の取得に失敗しました。');
        return;
      }
  
      const $ = cheerio.load(srcHtml);
      $('#mdAreaMajorLine tr').each((i, elem) => {
        const route = $(elem).find('td').eq(0).text().trim();
        const status = $(elem).find('td span.colTrouble').text().trim() || '平常運転';
        const memo = $(elem).find('td').eq(2).text().trim();
  
        if (status !== '平常運転' && userRouteList.includes(route)) {
          troubleList.push({
            route: route,
            status: status,
            memo: memo
          });
        }
      });
  
      if (troubleList.length > 0) {
        let message = '電車の遅延情報があります:\n';
        for (let trouble of troubleList) {
          message += `路線: ${trouble.route}\n状態: ${trouble.status}\nメモ: ${trouble.memo}\n\n`;
        }
        await sendLineMessage(message);
      }
  
    } catch (error) {
      console.error('メイン関数の実行中にエラーが発生しました:', error);
    }
}

main();
