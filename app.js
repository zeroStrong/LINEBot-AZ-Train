const axios = require('axios');
const cheerio = require('cheerio');

const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000;

// debug
app.get('/', (req, res) => res.send('Hello World!'))

// JSONミドルウェア
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Example app listening at https://linebot-train.azurewebsites.net:${PORT}`)
})


// LINEBotのアクセストークンを設定
const LINE_ACCESS_TOKEN = '7zb1GVoAW1abKC8hHSzukmeFFbGVEd6AZJ7dQq/F2BAZbTvQPmlvG4fsBgZYYwyWO9RE2FjBFm9wo0KkD+i/XDMV2fltbbantgU1awCJeOfTEo2/q5dXv02p/ltG8ff5UnxvLhG9RPVVnpUs1q5YUwdB04t89/1O/w1cDnyilFU='
//const USER_ID = 'U3c57f8b2741aa8d715028b63655cc5af';

// LINE Bot のイベントハンドラー
app.post('/webhook', (req, res) => {
  const events = req.body.events;

  if (!events) {
    console.error('イベントが存在しません。');
    return res.status(400).send('Bad Request');
  }

  events.forEach(event => {

    // イベントタイプを出力
    console.log('イベントタイプ:', event.type); 

    if (event.type === 'follow') {
      // 友達登録イベント
      sendLineMessage(event.source.userId, '友達登録ありがとうございます！\n希望の電車の路線を教えてください。');
    } else if (event.type === 'message' && event.message.type === 'text') {
      // テキストメッセージイベント
      const message = event.message.text;
      // ここにメッセージ処理を追加
      console.log('ユーザーからのメッセージ:', message);
    }
  });

  res.status(200).send({
    "status": "OK"
  });
});

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
function sendLineMessage(user_id, message) 
{
    const url = 'https://api.line.me/v2/bot/message/push';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
    };
    const data = {
        to: user_id, // メッセージを送信するユーザーのID
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
  
        if (status != '平常運転' && userRouteList.includes(route)) {
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
        await sendLineMessage(USER_ID, message);
      }
  
    } catch (error) {
      console.error('メイン関数の実行中にエラーが発生しました:', error);
    }
}

//setInterval(main, 60000);
