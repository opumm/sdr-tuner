document.getElementById('connectTuner').addEventListener('click', () => {
  if (navigator.serial) {
    connectSerial();
  } else {
    alert('Web Serial API not supported.');
  }
});

function tuner_freq(value) {
  // var step=les_modes[SDR_RX.mode][5];
  // SDR_RX.fine = SDR_RX.fine+step*value;
  // choix_freq_fine();
  // Affiche_Curseur();

  console.log('tune change: ' + value + '\n');

}

function ptt_on() {
  // if(!audioTX.Transmit){
  //   Transmit_Flip_On_Off();
  // }
  console.log('TX started \n');
}

function ptt_off() {
  // if(audioTX.Transmit){
  //   Transmit_Flip_On_Off();
  // }
  console.log('TX ended \n');
}

async function changeState(value){
  switch (value.trim()) {
    case '2':
      ptt_on();
      break;
    case '3':
      tuner_freq(1)
      break;
    case '4':
      tuner_freq(-1)
      break;
    case '6':
      tuner_freq(10)
      break;
    case '8':
      tuner_freq(-10)
      break;
    case '9':
      ptt_off();
  }
}

async function connectSerial() {
  try {
    const port = await navigator.serial.requestPort();
    await port.open({
      baudRate: 9600
    });
    console.log('Tuner connected!');

    const decoder = new TextDecoderStream();

    port.readable.pipeTo(decoder.writable);

    const inputStream = decoder.readable;
    const reader = inputStream.getReader();

    while (true) {
      const {
        value,
        done
      } = await reader.read();
      if (value) {
        changeState(value);
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