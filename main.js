// Configuración
const CONFIG = {
  subjectFilter: 'subject:"Pagaste $" newer_than:1d',   // Este asunto es especifico de los correos de Santander
  telegramToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
  telegramChatId: '-1111111111' // Group id de telegram donde se va a enviar el mensaje
};

// Función principal que se ejecuta
function checkCreditCardEmails() {
  var threads = GmailApp.search(CONFIG.subjectFilter);
  
  threads.forEach(function(thread) {
    var messages = GmailApp.getMessagesForThread(thread);
    
    messages.forEach(function(message) {
      if (!message.isStarred()) { // Solo nuevos
        var body = message.getBody(); // cuerpo HTML
        var extractedInfo = extractImportantInfo(body);
        
        if (extractedInfo) {
          sendTelegramNotification(extractedInfo);
        } else {
          sendTelegramNotification("💳 Consumo detectado, pero no se pudo extraer info del correo.");
        }
        
        message.star(); // Marcar como procesado
      }
    });
  });
}

function extractImportantInfo(body) {
  try {
    // Buscar el texto dentro de la etiqueta <strong> que contiene la tarjeta
    var cardMatch = body.match(/>(Tarjeta [^<]+ Crédito)</i);
    var cardText = cardMatch ? cardMatch[1] : "Tarjeta desconocida";

    // Decodificar el texto, reemplazando el encoded =C3=A9 por é
    cardText = decodeQuotedPrintable(cardText);

    // Buscar los últimos 4 dígitos de la tarjeta
    var cardDigitsMatch = body.match(/terminada en[\s=]*<strong[^>]*>(\d{4})<\/strong>/i);
    var lastDigits = cardDigitsMatch ? cardDigitsMatch[1] : "XXXX";

    // Buscar el monto
    var amountMatch = body.match(/Pagaste\s*\$([\d.,]+)/i);
    var amount = amountMatch ? "$" + amountMatch[1] : "Monto desconocido";

    // Buscar el comercio
    var commerceMatch = body.match(/Comercio[\s\S]*?<strong[^>]*>([^<]+)<\/strong>/i);
    var commerce = commerceMatch ? commerceMatch[1].trim() : "Comercio desconocido";

    // Armar el mensaje final
    return `
      - Tarjeta: ${cardText}
      - Terminada en: ${lastDigits}
      - Monto: ${amount}
      - Comercio: ${commerce}`;

  } catch (e) {
    Logger.log("Error extrayendo datos: " + e.message);
    return null;
  }
}

// Función para decodificar el texto encodeado (específicamente =C3=A9 a é)
function decodeQuotedPrintable(str) {
  // Reemplaza las secuencias de código =C3=A9 por el carácter adecuado
  return str.replace(/=C3=A9/g, 'é');
}




// Función para enviar mensaje a Telegram
function sendTelegramNotification(message) {
  var text = encodeURIComponent("💳 NUEVO CONSUMO DETECTADO" + message);
  var url = `https://api.telegram.org/bot${CONFIG.telegramToken}/sendMessage?chat_id=${CONFIG.telegramChatId}&text=${text}`;
  
  var options = {
    "method": "get",
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log(response.getContentText());
  } catch (e) {
    Logger.log("Error enviando a Telegram: " + e.message);
  }
}
