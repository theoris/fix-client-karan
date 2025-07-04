exports.handler = async function (event, context) {
  const { BOT_TOKEN, CHAT_ID } = process.env;
  const { symbol, price } = JSON.parse(event.body);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: `🚨 ${symbol} เกินราคาเป้า! ตอนนี้: ${price}`
    })
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};