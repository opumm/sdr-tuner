document.getElementById('connectTuner').addEventListener('click', () => {
    if (navigator.serial) {
      connectSerial();
    } else {
      alert('Web Serial API not supported.');
    }
  });

  function tryParseJSONObject (jsonString){
    try {
        var o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) { }

    return false;
  };

  function tuner_freq(value){
    // var step=les_modes[SDR_RX.mode][5];
    // SDR_RX.fine = SDR_RX.fine+step*value;
    // choix_freq_fine();
    // Affiche_Curseur();
    const log = document.getElementById('target');
    log.textContent += 'tune change: ' + value + '\n';

  }
  
  async function connectSerial() {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      
      const decoder = new TextDecoderStream();
      
      port.readable.pipeTo(decoder.writable);
  
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();
      
      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          const obj = tryParseJSONObject(value)
          if (obj){
            tuner_freq(obj.change)
          }
        }
        if (done) {
          console.log('[readLoop] DONE', done);
          reader.releaseLock();
          break;
        }
      }
    
    } catch (error) {
      console.log(error);
    }
  }
 