/*
===============================================================================================================
Library:
SimpleRotary
===============================================================================================================
*/
#include <SimpleRotary.h>

int tune_step = 10; // default 10 Hz

int rotaryPushButton = 4;
int mutiplierState = 0;

int mutiplierStateLED = 6;

int PTTStateLED = 5;
int PTTPushButton = 7;

// Pin A, Pin B, Button Pin
SimpleRotary rotary(2,3,rotaryPushButton);

  

void setup() {

  // Set the trigger to be either a HIGH or LOW pin (Default: HIGH)
  // Note this sets all three pins to use the same state.
  rotary.setTrigger(HIGH);

  // Set the debounce delay in ms  (Default: 2)
  rotary.setDebounceDelay(5);

  // Set the error correction delay in ms  (Default: 200)
  rotary.setErrorDelay(250);

  // set rotary push button mode
  pinMode(rotaryPushButton, INPUT_PULLUP);

  // set multiplier state LED mode
  pinMode(mutiplierStateLED, OUTPUT);

  // set PTT push button mode
  pinMode(PTTPushButton, INPUT_PULLUP);

  // set PTT state LED mode
  pinMode(PTTStateLED, OUTPUT);
  
  Serial.begin(9600);
}

void loop() {
  int rotaryPushButtonState = digitalRead(rotaryPushButton);
  if (rotaryPushButtonState != 1){
    if (mutiplierState >= 1) {
      mutiplierState = 0;
      digitalWrite(mutiplierStateLED, LOW);
    }
    else {
      mutiplierState = 1;
      digitalWrite(mutiplierStateLED, HIGH);
    }
  }


  int pttButtonState = digitalRead(PTTPushButton);
  if (pttButtonState) {
    digitalWrite(PTTStateLED, LOW);
  } else {
    digitalWrite(PTTStateLED, HIGH);
  }

  
  
  byte i;
  i = rotary.rotate();
  
  // Only print CW / CCW output to prevent an endless stream of output.
  if ( i == 1 || i == 2) {
    int tune_value = tune_step;
    if (i==1) {
      tune_value = tune_step * -1;
    }
    
    String change_value = String(tune_value);
    String change_str = String("{\"change\": " + change_value + "}");
    Serial.println(change_str);
  }
  
}
