const axios = require('axios');
const cheerio = require('cheerio');

const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000;

// debug
app.get('/', (req, res) => res.send('Hello World!'))

// JSONミドルウェア
// 受け取るフォーマットをJSON形式にする
// しないと、イベントがうまく受けるとことができない
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Example app listening at https://linebot-train.azurewebsites.net:${PORT}`)
})


// LINEBotのアクセストークンを設定
const LINE_ACCESS_TOKEN = '7zb1GVoAW1abKC8hHSzukmeFFbGVEd6AZJ7dQq/F2BAZbTvQPmlvG4fsBgZYYwyWO9RE2FjBFm9wo0KkD+i/XDMV2fltbbantgU1awCJeOfTEo2/q5dXv02p/ltG8ff5UnxvLhG9RPVVnpUs1q5YUwdB04t89/1O/w1cDnyilFU='
//const USER_ID = 'U3c57f8b2741aa8d715028b63655cc5af';

// userの登録状態を保持するリスト
const userState = {};

// userの路線データを保持
const userRouteList = [];

// 宣言した地域を保持
var area = '';

const routesByRegion = {
  '北海道': [
    '函館本線',
    '室蘭本線',
    '札幌市営地下鉄東西線',
    '札幌市営地下鉄南北線',
    '札幌市営地下鉄東豊線'
  ],
  '東北': [
    '東北本線',
    '奥羽本線',
    '常磐線',
    '仙山線',
    '仙石線',
    '磐越西線',
    '五能線',
    '田沢湖線',
    '山形新幹線'
  ],
  '関東': [
    '山手線',
    '中央線',
    '京浜東北線',
    '総武線',
    '常磐線',
    '埼京線',
    '湘南新宿ライン',
    '京葉線',
    '横須賀線',
    '東海道線',
    '南武線',
    '武蔵野線',
    '八高線',
    '相模線',
    '伊勢崎線',
    '日比谷線',
    '半蔵門線',
    '銀座線',
    '丸ノ内線',
    '千代田線',
    '東西線',
    '有楽町線',
    '南北線',
    '副都心線',
    'つくばエクスプレス'
  ],
  '中部': [
    '東海道本線',
    '中央本線',
    '名鉄名古屋本線',
    '近鉄名古屋線',
    'あおなみ線',
    '愛知環状鉄道線',
    '北陸本線',
    '高山本線',
    '飯田線',
    '静岡鉄道静岡清水線',
    '伊豆箱根鉄道駿豆線'
  ],
  '近畿': [
    'JR宝塚線',
    'JR京都線',
    'JR神戸線',
    'JR東西線',
    '山陽本線',
    '阪急神戸本線',
    '阪急宝塚本線',
    '阪急京都本線',
    '阪神本線',
    '京阪本線・中之島線',
    '京阪交野線',
    '京阪宇治線',
    '京阪京津線',
    '京阪石山坂本線',
    '近鉄奈良線',
    '近鉄大阪線',
    '南海本線',
    '阪和線',
    '大阪環状線',
    '御堂筋線',
    '谷町線',
    '四つ橋線',
    '中央線',
    '千日前線',
    '堺筋線'
  ],
  '中国': [
    '山陽本線',
    '伯備線',
    '芸備線',
    '津山線',
    '福塩線',
    '宇野線',
    '赤穂線',
    '境線',
    '一畑電車北松江線',
    '岡山電気軌道東山本線'
  ],
  '四国': [
    '予讃線',
    '土讃線',
    '高徳線',
    '徳島線',
    '牟岐線',
    '内子線',
    '琴電琴平線',
    '琴電長尾線',
    '琴電志度線'
  ],
  '九州': [
    '鹿児島本線',
    '日豊本線',
    '長崎本線',
    '佐世保線',
    '筑肥線',
    '福岡市地下鉄空港線',
    '福岡市地下鉄箱崎線',
    '福岡市地下鉄七隈線',
    '熊本市電A系統',
    '熊本市電B系統',
    '鹿児島市電第一期線',
    '鹿児島市電第二期線'
  ]
};

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
    const userId = event.source.userId;

    // 友達登録イベント

    if (event.type === 'follow') {
      // 友達登録イベント
      const greeting = '友達登録ありがとうございます！\n希望の電車の路線が属する地域を以下から教えてください。\n';
      const region = '・北海道\n・東北\n・関東\n・中部\n・近畿\n・中国\n・四国\n・九州';

      sendLineMessage(event.source.userId, greeting + region);
      userState[event.source.userId] = 'awaitingRegion';

      // メッセージが送信されたら、地域選択状態なら処理を実行
    } else if (event.type === 'message' && event.message.type === 'text' && userState[userId] === 'awaitingRegion') {
      const message = event.message.text;

      // 路線選択状態
      if (routesByRegion[message]) {
        area = message; // 地域名を保持
        const routeOptions = routesByRegion[message].join('\n');
        sendLineMessage(userId, `地域: ${message} \n登録したい路線を以下から教えてください。\n${routeOptions}`);
        userState[userId] = 'awaitingRoute';
      } else {
        sendLineMessage(userId, '無効な地域が入力されました。以下のリストから地域を選択してください。\n・北海道\n・東北\n・関東\n・中部\n・近畿\n・中国\n・四国\n・九州');
      }

      //メッセージが送信され、路線選択状態なら処理を実行
    } else if (event.type === 'message' && event.message.type === 'text' && userState[userId] === 'awaitingRoute') {
      const message = event.message.text;
      console.log('地域', routesByRegion[area]);
      console.log('area', area);
      console.log('判定', routesByRegion[area].includes(message))


      // 路線選択状態
      if (routesByRegion[area].includes(message)) {
        // userRouteListに路線データを追加
        userRouteList.push(message);
        sendLineMessage(userId, `路線: ${message} を登録しました。`);
        sendLineMessage(userId, '引き続き路線を登録する場合は、路線名を入力してください。\n登録を終了する場合は、「終了」と入力してください。');
      } else {
        sendLineMessage(userId, '無効な路線が入力されました。');
      }
    } else if (event.type === 'message' && event.message.type === 'text' && event.message.text === '終了') {
      sendLineMessage(userId, '登録が完了しました！今後は以下のコマンドからいつでも呼びかけてください！\n' +
                              '登録:路線を新たに追加したい場合はこちら!\n' + 
                              '現在:現在登録中の路線を確認する場合はこちら!\n' + 
                              '確認:どの路線が登録可能か確認する場合はこちら!\n' +
                              '削除:現在登録中の路線を削除する場合はこちら!\n' + 
                              'ヘルプ：どんなコマンドがあるか忘れた場合はこちら!')
    }
  });

  res.status(200).send({
    "status": "OK"
  });
});

// -----------電車の遅延情報を取得する処理を記述-----------
async function getTrainDelayInfo() {
  const url = "https://transit.yahoo.co.jp/diainfo/area/6";
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("電車の遅延情報の取得に失敗", error);
    return null;
  }
}

// -----------LINEBotにメッセージを送信する関数-----------
function sendLineMessage(user_id, message) {
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
async function main() {
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
