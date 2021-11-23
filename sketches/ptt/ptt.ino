#define MULTIPLIER_LED_PIN 6
#define MULTIPLIER_BUTTON_PIN 4
#define PTT_LED_PIN 5
#define PTT_BUTTON_PIN 7

byte multiplierLastBtnState = HIGH;
byte multiplierLedState = LOW;
unsigned long lastTimeButtonStateChanged = 0;
volatile byte multiplierState = 0;

byte pttBtnState = HIGH;
byte pttLedState = LOW;
unsigned long lastTimePttBtnStateChanged = 0;

unsigned long debounceDuration = 70; // millis

static int pinA = 2; // Our first hardware interrupt pin is digital pin 2
static int pinB = 3; // Our second hardware interrupt pin is digital pin 3
volatile byte aFlag = 0; // let's us know when we're expecting a rising edge on pinA to signal that the encoder has arrived at a detent
volatile byte bFlag = 0; // let's us know when we're expecting a rising edge on pinB to signal that the encoder has arrived at a detent (opposite direction to when aFlag is set)
volatile byte encoderPos = 0; //this variable stores our current value of encoder position. Change to int or uin16_t instead of byte if you want to record a larger range than 0-255
volatile byte reading = 0; //somewhere to store the direct values we read from our interrupt pins before checking to see if we have moved a whole detent

void setup() {
  pinMode(PTT_LED_PIN, OUTPUT);
  pinMode(PTT_BUTTON_PIN, INPUT_PULLUP);

  pinMode(MULTIPLIER_LED_PIN, OUTPUT);
  pinMode(MULTIPLIER_BUTTON_PIN, INPUT_PULLUP);

  pinMode(pinA, INPUT_PULLUP); // set pinA as an input, pulled HIGH to the logic voltage (5V or 3.3V for most cases)
  pinMode(pinB, INPUT_PULLUP); // set pinB as an input, pulled HIGH to the logic voltage (5V or 3.3V for most cases)
  attachInterrupt(0,PinA,RISING); // set an interrupt on PinA, looking for a rising edge signal and executing the "PinA" Interrupt Service Routine (below)
  attachInterrupt(1,PinB,RISING); // set an interrupt on PinB, looking for a rising edge signal and executing the "PinB" Interrupt Service Routine (below)

  Serial.begin(9600);
}

void MultiplierBtn(){
  if (millis() - lastTimeButtonStateChanged > debounceDuration) {
    byte buttonState = digitalRead(MULTIPLIER_BUTTON_PIN);
    if (buttonState != multiplierLastBtnState) {
      lastTimeButtonStateChanged = millis();
      multiplierLastBtnState = buttonState;
      if (buttonState == LOW) {
        multiplierLedState = (multiplierLedState == HIGH) ? LOW: HIGH;
        digitalWrite(MULTIPLIER_LED_PIN, multiplierLedState);
        multiplierState = multiplierLedState;
      }
    }
  }
}

void PttBtn(){
  if (millis() - lastTimePttBtnStateChanged > debounceDuration) {
    byte buttonState = digitalRead(PTT_BUTTON_PIN);
    if (buttonState != pttBtnState) {
      lastTimePttBtnStateChanged = millis();
      pttBtnState = buttonState;
      pttLedState = (pttLedState == HIGH) ? LOW: HIGH;
      digitalWrite(PTT_LED_PIN, pttLedState);

      if(pttBtnState) {
        Serial.println(9);
      } else {
        Serial.println(2);
      }
      delay(20);
    }
  }
}

void PinA(){
  cli(); //stop interrupts happening before we read pin values
  reading = PIND & 0xC; // read all eight pin values then strip away all but pinA and pinB's values
  if(reading == B00001100 && aFlag) { //check that we have both pins at detent (HIGH) and that we are expecting detent on this pin's rising edge
    encoderPos = 4; //decrement the encoder's position count
    bFlag = 0; //reset flags for the next turn
    aFlag = 0; //reset flags for the next turn
  }
  else if (reading == B00000100) bFlag = 1; //signal that we're expecting pinB to signal the transition to detent from free rotation
  sei(); //restart interrupts
}

void PinB(){
  cli(); //stop interrupts happening before we read pin values
  reading = PIND & 0xC; //read all eight pin values then strip away all but pinA and pinB's values
  if (reading == B00001100 && bFlag) { //check that we have both pins at detent (HIGH) and that we are expecting detent on this pin's rising edge
    encoderPos = 3; //increment the encoder's position count
    bFlag = 0; //reset flags for the next turn
    aFlag = 0; //reset flags for the next turn
  }
  else if (reading == B00001000) aFlag = 1; //signal that we're expecting pinA to signal the transition to detent from free rotation
  sei(); //restart interrupts
}

void ChangeFreq(){
  if(encoderPos){
    if(multiplierState) {
      Serial.println(encoderPos * 2);
    } else {
      Serial.println(encoderPos);
    }
    encoderPos = 0;
  }
}

void loop() {
  MultiplierBtn();
  PttBtn();

  ChangeFreq();
  
//  Serial.print("mlt: ");
//  Serial.println(multiplierState);
//
//  Serial.print("ptt: ");
//  Serial.println(pttBtnState);

  
  
}
