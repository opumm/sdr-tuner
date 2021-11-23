// ***********************************
// *           REMOTE SDR v3         *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
const Version = "Remote SDR V4.0<br><a href='http://f1atb.fr' target='_blank'>F1ATB</a> November 2021";				
const Version_Local_Storage = "4.0";
//Visus
const FFT = 2048; //Taille FFT
var visus={spectre_haut:0.0002,spectre_bas:0,spectre_lisse:true,water_haut:0.0004,water_bas:0};
var voies_moy=new Array();for (var i=0;i<FFT;i++) { voies_moy[i]=0;}
var waterfall={ligne:0,bloc:false};

//Page
var ecran={large:true,largeur:1,hauteur:1,innerW:1,innerH:1,border:5};
var fenetres={spectreW:0,spectreH:0,waterW:10,waterH:10,para_visus_visible:false};
//Tracking Beacons/Balises
var balise={nb:0,Voies:new Array(),F_Voies:new Array(),Freq:new Array(),Idx:new Array(),Idx_zone:new Array(),voie_recu:false,nb_voies:FFT,K:new Array(),meanDelta:0};
//Band Plan
var Liste_F=new Array();
var Liste_F_Perso=new Array();
//Zoom Frequency display
var ZoomFreq={id:"",pos:0};
//GPIOstate
var RX_GPIO_state="";
//CPUs
var CPU_Model ="";
var CPU_Models =[];
//Scan
var RX_Scan={on:false,areas:new Array(),idx:-1,level:50,count:0,idx_max:0};
var BeamsToScan=new Array();
//Storage
var Local_Storage = false;
var RX_Xtal_Errors=new Array();  //Errors Xtal frequency


// CANVAS
//********
// Oscillo


var TraceAudio={X:0,Y:50,Z:50,H:50,T0:0,T:0}
function Trace_Audio(){

	var Oscillo={H:$("#Oscillo").innerHeight(),W:$("#Oscillo").innerWidth()};
	TraceAudio.H=Oscillo.H-30;
	TraceAudio.T=Oscillo.H-10;
	var canvasOscillo = document.getElementById("myOscillo");
	var ctx = canvasOscillo.getContext("2d");
	var Tc=new Date;
	Tc=Tc.getTime();
	var Xold=TraceAudio.X;
	if ((Tc-TraceAudio.T0)>7500) { 
		TraceAudio.T0=Tc; // Synchro balayage X
		ctx.clearRect(0, 0,Oscillo.W,Oscillo.H);
		Xold=0;
		ctx.beginPath();
		ctx.strokeStyle = "white";
		ctx.fillStyle ="White";
		for (var i=1;i<7;i++){
			var X=i*Oscillo.W/7.5;
			ctx.moveTo(X, Oscillo.H);
			ctx.lineTo(X,TraceAudio.T);
			ctx.fillText(i, X, TraceAudio.T);	
		}
		ctx.fillText("   s",X,  TraceAudio.T);	
		ctx.stroke();
	}
	TraceAudio.X=(Tc-TraceAudio.T0)*Oscillo.W/7500;
	
	if (audioRX.Ctx!=null){
		ctx.beginPath();
		ctx.strokeStyle = "Aqua";
		ctx.moveTo(Xold, TraceAudio.Y);
		audioRX.idxRempli=audioRX.idx_charge%audioRX.nbFrames;
		TraceAudio.Y=TraceAudio.H-audioRX.idxRempli*TraceAudio.H/audioRX.nbFrames;
		ctx.lineTo(TraceAudio.X, TraceAudio.Y); //Buffer en entrée ecriture
		ctx.stroke();
		ctx.beginPath();
		var Old_idx_sortie=audioRX.idx_sortie;
		audioRX.idx_sortie=Math.floor(audioRX.Ctx.currentTime*audioRX.Ctx.sampleRate);
		var idx_lecture=audioRX.idx_sortie%audioRX.nbFrames;
		ctx.strokeStyle = "#FFFF00";
		ctx.moveTo(Xold, TraceAudio.Z);
		TraceAudio.Z=TraceAudio.H-idx_lecture*TraceAudio.H/audioRX.nbFrames;
		ctx.lineTo(TraceAudio.X, TraceAudio.Z);  //Buffer en lecture audio
		ctx.stroke();
	}		
	
	
}
function 	Trace_Spectre(spectre){
	var Amp_min=10000000000;
	var Amp_max=-10000000000;
	var X=0
	var dX=ecran.innerW/spectre.length;
	var H=fenetres.spectreH;
	var S='<svg height="'+H+'" width="'+ecran.innerW+'" >'; //SVG type of drawing
	S+='<defs><linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">';
    S+='<stop offset="0%" style="stop-color:rgb(255,100,100);stop-opacity:1" />';
	S+='<stop offset="33%" style="stop-color:rgb(200,200,100);stop-opacity:1" />';
	S+='<stop offset="66%" style="stop-color:rgb(100,100,150);stop-opacity:1" />';
    S+='<stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:1" />';
    S+='</linearGradient>';
	S+='</defs>'
	S+='<polygon style="stroke:orange;stroke-width:1" points="0,256 ';
	var Sl=spectre.length;
	var Sl2=spectre.length/2;
	var Sm1=0.15*Sl; //Limits to look for minimum noise, except bad edges and middle
	var Sm2=0.49*Sl;
	var Sm3=0.51*Sl;
	var Sm4=0.85*Sl;
	
	for (var i=0;i<Sl;i++){
		var j=(i+Sl2)%Sl; // Array is shifted by 1/2 in GNU Radio Block FFT Mag Log
		
		
		voies_moy[i]=0.1*spectre[j]+0.9*voies_moy[i]; //Mean values - First Order Filter
		
	
		if(visus.spectre_lisse){
			var Y=Math.floor(H*(1-visus.spectre_haut*(voies_moy[i]+visus.spectre_bas)));
		} else {
			var Y=Math.floor(H*(1-visus.spectre_haut*(spectre[j]+visus.spectre_bas)));
		}
		S+=X+','+Y+' ';
		X+=dX;
		
		if ( (i>Sm1 && i<Sm2) || (i>Sm3 && i<Sm4) ) { //dans la bande utile et pas au millieu
			Amp_min=Math.min(Amp_min,voies_moy[i]);
			Amp_max=Math.max(Amp_max,voies_moy[i]);
		}
	}
	
	
	S+=X+',256 0,256" fill="url(#grad1)"  /></svg>';
	$("#mySpectre").html(S);
	//Band Scan
	RX_Scan.count++; //+ per second
	if (RX_Scan.on && RX_Scan.count>0) {
		RX_Scan.count=-1;
		var seuil_=H*RX_Scan.level/100;
		var seuil=((1-seuil_/H)/visus.spectre_haut) - visus.spectre_bas;
		for (var i=0;i<Sl;i++){
			var j=(i+RX_Scan.idx_max)%Sl;
			
			if(BeamsToScan[j]){
				if (voies_moy[j]>seuil){
					
					RX_Scan.count=-50;
					var Ffine = Estimate_Max_Freq(j); // j=Index voie qui a franchi le seuil
					if (SDR_RX.mode==0 )  Ffine += 700;//  LSB  shift estimate
					if (SDR_RX.mode==1 )  Ffine += -700;//  USB 
					SDR_RX.fine =Ffine;
					choix_freq_fine()
					RX_Scan.idx_max=Math.floor(FFT*((SDR_RX.fine+10000)/SDR_RX.bande+0.5)); // Next channel to scan 10 kHz at the right 
					
					Affiche_Curseur();
					
					i=Sl;
					
				}
				
			}
		}
	}
	
	//Niveau S_metre
	var deltaF1=RX_modes[SDR_RX.mode][1]/2;
	var deltaF0=-deltaF1;
	if (SDR_RX.mode==0 )  {deltaF0=2*deltaF0;deltaF1=0;}//  LSB
	if (SDR_RX.mode==1 )  {deltaF1=2*deltaF1;deltaF0=0;}//  USB 
	var idx_audio0=Math.floor(Sl*(0.5+(SDR_RX.fine +deltaF0)/(SDR_RX.bande)));
	var idx_audio1=Math.floor(Sl*(0.5+(SDR_RX.fine +deltaF1)/(SDR_RX.bande)));
	S_metre.level=-100000;
	for (var i=idx_audio0;i<=idx_audio1;i++){
		var j=Math.max(0,i);
		j=Math.min(Sl-1,j);
		S_metre.level=Math.max(S_metre.level,voies_moy[j]);
	}
	S_metre.bruit=0.9999*Amp_min+0.0001*S_metre.bruit; //Noise level on horizon	
	
	S_metre.RC_level=Math.max(S_metre.level,0.05*S_metre.level+0.95*S_metre.RC_level); //Montée rapide
	var Sdb=(S_metre.RC_level-S_metre.bruit)/100;
	$("#Smetre_RC").html(Sdb.toFixed(1)); //dB au dessus du bruit
	var teta=S_metre.teta*(-1+Sdb/25);
	$("#SM_fleche").css("transform","rotate("+teta+"rad)");		
	//Spectre Zoom autour audio +-5kHz
	var W=$("#zSpectre").innerWidth();
	var H=$("#zSpectre").innerHeight();

	var canvasZS = document.getElementById("zcSpectre");
	var ctx = canvasZS.getContext("2d");
	ctx.lineWidth = 1;
	ctx.clearRect(0, 0,W,H);
	ctx.beginPath();
	var my_gradient = ctx.createLinearGradient(0, 0, 0, H);
	my_gradient.addColorStop(0, "#f66");
	my_gradient.addColorStop(0.33, "#cc6");
	my_gradient.addColorStop(0.66, "#66c");
	my_gradient.addColorStop(1, "#04c");
	ctx.fillStyle = my_gradient;
	var idx_audio_deb=Math.floor(Sl*(0.5+(SDR_RX.fine-5000)/(SDR_RX.bande)));
	var idx_audio_fin=Math.floor(Sl*(0.5+(SDR_RX.fine+5000)/(SDR_RX.bande)));
	ctx.moveTo(-1,H);
	var dX=W*(SDR_RX.bande)/Sl/10000;
	var X=W*(((SDR_RX.bande)*(idx_audio_deb/Sl-0.5)-SDR_RX.fine)/10000+0.5);
	for (var idx=idx_audio_deb;idx<=idx_audio_fin;idx++){
		if (idx>=0 && idx <Sl) {
			var Y=H*visus.spectre_haut*(voies_moy[idx]+visus.spectre_bas)+1;
			ctx.fillRect(X, H-Y, dX, H);			
		} 
		X=X+dX;
	}
	ctx.strokeStyle = "#f00"; //Curseur Audio au milieu
	ctx.moveTo(0.5*W,H);
	ctx.lineTo(0.5*W,0);
	ctx.stroke();
	//Curseur balises
	ctx.beginPath();
	ctx.strokeStyle = "DarkOrange";
	for (var i=0;i<balise.Idx.length;i++){
				if(balise.Idx[i]>=idx_audio_deb && balise.Idx[i]<=idx_audio_fin) {
					var X=W*((balise.Freq[i]-SDR_RX.Audio_RX)/10000+0.5);
					ctx.moveTo(X,H);
					ctx.lineTo(X,0);
				}
	}
	ctx.stroke();
	//Marqueur kHz
	ctx.beginPath();
	ctx.strokeStyle = "White";
	ctx.fillStyle ="White";
	for (var f=-4;f<=4;f=f+2){	
					var X=W*(f/10+0.5);
					ctx.moveTo(X,H);
					ctx.lineTo(X,0.9*H);
					ctx.fillText(f, X, 0.9*H);							
	}
	ctx.fillText("kHz", W*0.93, 0.9*H);	
	ctx.stroke();
	
}

function Estimate_Max_Freq(Idx0){
	var dIdx=Math.floor(5+FFT*RX_modes[SDR_RX.mode][1]/SDR_RX.bande); //Define search area according to bandwidth
	var idx_start=Math.max(0,Idx0-dIdx);
	var idx_end=Math.min(FFT-1,Idx0+dIdx);
	var Vmax=-100000;
	for (var i=idx_start;i<=idx_end;i++){
		if ( voies_moy[i]> Vmax) {
			Idx0=i; //Search maximum beam
			Vmax=voies_moy[i];
		}
	}
	Idx0=Math.max(5,Math.min(FFT-5,Idx0))
	var Vg=Math.pow(10,voies_moy[Idx0-1]/10000); //Linear and not dB
	var Vc=Math.pow(10,voies_moy[Idx0]/10000);
	var Vd=Math.pow(10,voies_moy[Idx0+1]/10000);
	
	var dIdx=5*(Vd - Vg)/Vc;
	dIdx=Math.max(-0.5,Math.min(0.5,dIdx))
	var Freq_of_Max=((Idx0+dIdx+0.5)/FFT-0.5)*SDR_RX.bande; //Freq fine of the maximum
	return Freq_of_Max;
}
function Trace_Waterfall(spectre){
	if (waterfall.ligne==0) waterfall.bloc=!waterfall.bloc;	
	var L=fenetres.waterH-waterfall.ligne-1;
	var p0=-L +"px";
	var p1=-L+fenetres.waterH +"px";
	if (waterfall.bloc){			
		$("#myWaterfall0").css("top",p0);
		$("#myWaterfall1").css("top",p1);
	} else {
		$("#myWaterfall0").css("top",p1);
		$("#myWaterfall1").css("top",p0);
	}
	var canvasWaterfall0 = document.getElementById("myWaterfall0");
	var ctxW0 = canvasWaterfall0.getContext("2d");
	var canvasWaterfall1 = document.getElementById("myWaterfall1");
	var ctxW1 = canvasWaterfall1.getContext("2d");
    var Amp=Math.PI*3/2;
	var Sl=spectre.length;
	var Sl2=spectre.length/2;
	if (waterfall.bloc){
			var imgData = ctxW0.getImageData(0, L, FFT, 1);
		} else {
			var imgData = ctxW1.getImageData(0, L, FFT, 1);
		}
	 var k=0;
	for (var i=0;i<spectre.length;i++){
		var j=(i+Sl2)%Sl; //Decalage en frequence FFT d'un 1/2 tableau
		var A=Amp*Math.max(visus.water_haut*(spectre[j]+visus.water_bas),0);
		A=Math.min(A,Amp);
		var r=Math.floor(Math.max(0,-255*Math.sin(A))); //Conversion amplitude to color
		var v=Math.floor(Math.max(0,-255*Math.cos(A)));
		var b=Math.floor(Math.max(0,255*Math.sin(A)));
		imgData.data[k] =r;      //Red
		imgData.data[k + 1] = v; //Green
		imgData.data[k + 2] = b; //Blue
		imgData.data[k + 3] = 255;
		k=k+4;
	}
	if (waterfall.bloc){
			ctxW0.putImageData(imgData, 0, L); //On modifie la ligne L
	} else {
			ctxW1.putImageData(imgData, 0, L);
	}
	waterfall.ligne=(waterfall.ligne+1)%fenetres.waterH;
}
function Trace_Echelle(){ // Scale drawing
	var canvasEchelle = document.getElementById("myEchelle");
	var ctxE = canvasEchelle.getContext("2d");
	SDR_RX.min=parseInt(SDR_RX.centrale_RX)-SDR_RX.echant/2/bandes[SDR_RX.idx_bande][2];
	SDR_RX.max=parseInt(SDR_RX.centrale_RX)+SDR_RX.echant/2/bandes[SDR_RX.idx_bande][2];
	SDR_RX.bande=SDR_RX.max-SDR_RX.min; // Bande exacte à l'ecran
	ctxE.beginPath();
	ctxE.strokeStyle = "#FFFFFF";
	ctxE.fillStyle = "#FFFFFF";
	ctxE.lineWidth = 1;
	ctxE.clearRect(0, 0,ecran.innerW,44);	
	ctxE.font = "10px Arial";
	if (ecran.large) ctxE.font = "12px Arial";
	for (var f=SDR_RX.min;f<=SDR_RX.max;f=f+10000){
		var Fint=10000*Math.floor(f/10000);
		var X=(Fint-SDR_RX.min)*ecran.innerW/(SDR_RX.bande);
		ctxE.moveTo(X,0);
		var Y=10;
		var Fintk=Fint/1000;
		var Ytext=25;
		if (ecran.large) Ytext=30;
		if (ecran.large || (SDR_RX.max<SDR_RX.min+1000001)) {
			if (Fint%50000==0) Y=15;
			if (Fint%100000==0) ctxE.fillText(Fintk, X-ctxE.measureText(Fintk).width/2, Ytext);	
		} else {
			if (Fint%100000==0) Y=15;
			if (Fint%500000==0) ctxE.fillText(Fintk, X-ctxE.measureText(Fintk).width/2,Ytext);
        }			
		ctxE.lineTo(X,Y); //traits		
	}
	ctxE.stroke(); // Fin graduations
	//Ecriture bande en couleur
	ctxE.lineWidth = 2;
	for (var i=0;i<Zone.length;i++){
		if ( (Zone[i][0]>=SDR_RX.min && Zone[i][0]<=SDR_RX.max) || (Zone[i][1]>=SDR_RX.min && Zone[i][1]<=SDR_RX.max)){
			ctxE.beginPath();
			ctxE.strokeStyle = Zone[i][2];
			var X0=(Zone[i][0]-SDR_RX.min)*ecran.innerW/(SDR_RX.bande);
			var X1=(Zone[i][1]-SDR_RX.min)*ecran.innerW/(SDR_RX.bande);
			ctxE.moveTo(X0,0);			
			ctxE.lineTo(X1,0); //traits
			ctxE.stroke();
		}
	}
	//Ecriture Labels des Liste_F
	var S="";
	for (var i=0;i<Liste_F.length;i++){
		if (Liste_F[i][0]>=SDR_RX.min && Liste_F[i][0]<=SDR_RX.max){
			var X=(Liste_F[i][0]-SDR_RX.min)*ecran.innerW/(SDR_RX.bande);
			S+='<div style="left:'+X+'px;" class="coral" onclick="Flabel('+Liste_F[i][0]+',event);">'+Liste_F[i][1]+'</div>';
		}
	}
	$("#echelle_Label").html(S);
	//Beacons tracking to compensate clock offset 
	balise.nb=0;
	var S="";
	balise.Freq=new Array;
	balise.Idx=new Array;
	balise.F_Voies=new Array;
	balise.Voies=new Array;
	balise.K=new Array;
	balise.Idx_zone=new Array();
	var Fmin=SDR_RX.centrale_RX-SDR_RX.bande/2.4;
	var Fmax=SDR_RX.centrale_RX+SDR_RX.bande/2.4;
	for (var i=0;i<BeaconSync.length;i++){
		 balise.Idx_zone[i]=[0,0];
		if (BeaconSync[i][0]>=Fmin && BeaconSync[i][0]<=Fmax && Math.abs(BeaconSync[i][0]-SDR_RX.centrale_RX)>4000){
			var X=Math.floor((BeaconSync[i][0]-SDR_RX.min)*ecran.innerW/(SDR_RX.bande));
			S+='<div id="beacon'+i+'" style="left:'+X+'px">^</div>';
			balise.Freq[balise.nb]=BeaconSync[i][0];
			balise.Idx[balise.nb]=Math.floor(balise.nb_voies*(0.5+(balise.Freq[balise.nb]-SDR_RX.centrale_RX)/(SDR_RX.bande))); //Voie centrale
			balise.Idx_zone[balise.nb][0]=Math.floor(balise.nb_voies*(0.5+(balise.Freq[balise.nb]-SDR_RX.centrale_RX-10000)/(SDR_RX.bande))); //Voie bas zone recherche grossière
			balise.Idx_zone[balise.nb][1]=Math.floor(balise.nb_voies*(0.5+(balise.Freq[balise.nb]-SDR_RX.centrale_RX+10000)/(SDR_RX.bande))); //Voie haute zone recherche grossière
			balise.F_Voies[balise.nb]=SDR_RX.centrale_RX+(balise.Idx[balise.nb]+0.5-balise.nb_voies/2)*SDR_RX.bande/balise.nb_voies; //Freq centre voie
			balise.Voies[balise.nb]=[0,0,0]; //Amplitude gauche,centre droite
			var Kc=2*balise.nb_voies*(BeaconSync[i][0]-balise.F_Voies[balise.nb])/(SDR_RX.bande); // Coef ponderation voie centrale
			if (BeaconSync[i][0]>balise.F_Voies[balise.nb]){
					balise.K[balise.nb]=[Kc-1,-Kc,1]; //Coef gauche, centre,droite
			} else {
					balise.K[balise.nb]=[-1,-Kc,1+Kc];
			}
			balise.nb++;
		}
	}
	$("#echelle_track").html(S); //Marqueurs des beacons
	Audio_Bandwidth();
	
	//Scan Areas
	//**********
	
	//Remove scan zone overlapoverlap
	if (RX_Scan.areas.length>1) {
		for (var i=0;i<RX_Scan.areas.length-1;i++){
			var Area=RX_Scan.areas[i];
			for (var j=i+1;j<RX_Scan.areas.length;j++){
				var fmin=RX_Scan.areas[j].Fmin;
				var fmax=RX_Scan.areas[j].Fmax;
				if ((fmin >=  Area.Fmin && fmin <=  Area.Fmax) || (fmax>=  Area.Fmin && fmax <=  Area.Fmax)) {  //Overlap
					RX_Scan.areas[i].Fmin=Math.min(Area.Fmin,fmin); // fuse
					RX_Scan.areas[i].Fmax=Math.max(Area.Fmax,fmax);
					RX_Scan.areas[j].Fmin=0;RX_Scan.areas[j].Fmax=0;
				}
			}
		}
		for (var i=RX_Scan.areas.length-1;i>=0;i--){
			if (RX_Scan.areas[i].Fmin == 0) {
				RX_Scan.areas.splice(i,1); //Remove overlap
			}
		}
	}
	for (var i=0;i<FFT;i++) { BeamsToScan[i]=false;}
	S="";
	var one_valid=false;
	for (var i=0;i<RX_Scan.areas.length;i++){
		var Area=RX_Scan.areas[i];
		if ((Area.Fmin>=SDR_RX.min && Area.Fmin<=SDR_RX.max)  || (Area.Fmax>=SDR_RX.min && Area.Fmax<=SDR_RX.max)) { //Freq min et max de la zone
			var left=Math.floor((Area.Fmin-SDR_RX.min)*ecran.innerW/(SDR_RX.bande));
			var right=Math.floor((Area.Fmax-SDR_RX.min)*ecran.innerW/(SDR_RX.bande));
			var width=right-left;
			S+='<div class="Scan_area" onmousedown="RX_Scan.idx='+i+';" style="left:'+left+'px;width:'+width+'px;"></div>';
			RX_Scan.areas[i].left=left;
			RX_Scan.areas[i].right=right;
			RX_Scan.areas[i].width=width;
			var idx_left=Math.floor((Area.Fmin-SDR_RX.min)*FFT/(SDR_RX.bande));idx_left=Math.max(0,idx_left);idx_left=Math.min(FFT -1,idx_left);
			var idx_right=Math.floor((Area.Fmax-SDR_RX.min)*FFT/(SDR_RX.bande));idx_right=Math.max(0,idx_right);idx_right=Math.min(FFT -1,idx_right);
			idx_right=Math.max(idx_left,idx_right);
			for (var j=idx_left;j<=idx_right;j++){
				BeamsToScan[j]=true;
			}
			one_valid=true;
		} 
	}
	
	if (!one_valid){
		RX_Scan.on=false;
		Scan_status();
	}
	$("#Scan_Zone").html(S);
	$("#Scan_Zone").css("top",RX_Scan.level*fenetres.spectreH/100);
	
}

//Scan
$("#Scan").click ( function() {
	//Scan button
	RX_Scan.on = !RX_Scan.on;
	if (RX_Scan.on) Scan_create_area();
	Scan_status();
	Save_SDR_Para();	
})
function Scan_status() {
	//Scan button
	if(RX_Scan.on) {
		$("#Scan").removeClass('bt_off').addClass('bt_on');
		$("#Scan_Zone").css("display","block");
	} else {
		$("#Scan").removeClass('bt_on').addClass('bt_off');
		$("#Scan_Zone").css("display","none");
	}
		
}
function Add_Scan(ev){
	ev.stopPropagation()
	Scan_create_area()
}
function Scan_create_area(){	
	var Area={Fmin:SDR_RX.Audio_RX-50000,Fmax:SDR_RX.Audio_RX+50000,left:0,right:0,width:0,in_band:false}
	RX_Scan.areas.push(Area);
	Trace_Echelle();
	
}


function Scan_move(ev){	
	if(RX_Scan.idx>=0) {
		 ev = ev || window.event;
		 ev.preventDefault();
		 ev.stopPropagation();
		 var pos_mouse =  ev.clientX-ecran.border;
		 var freq=Math.floor(SDR_RX.min+pos_mouse*SDR_RX.bande/ecran.innerW);
		 freq=Math.max(SDR_RX.BandeRXmin,freq);freq=Math.min(SDR_RX.BandeRXmax,freq);
		 if (RX_Scan.idx< RX_Scan.areas.length ){
			 if(Math.abs(pos_mouse-RX_Scan.areas[RX_Scan.idx].left)<2+RX_Scan.areas[RX_Scan.idx].width/2.5){
				 RX_Scan.areas[RX_Scan.idx].Fmin=freq;
				 $("#Scan_Zone").css("pointer","e-resize");
			 }
			  if(Math.abs(pos_mouse-RX_Scan.areas[RX_Scan.idx].right)<2+RX_Scan.areas[RX_Scan.idx].width/2.5){
				 RX_Scan.areas[RX_Scan.idx].Fmax=freq;
				  $("#Scan_Zone").css("pointer","e-resize");
			 }
			 var pos_mouse = 100*( ev.clientY -ecran.border-$("#spectre").offset().top)/fenetres.spectreH;
			 pos_mouse=Math.max(0,pos_mouse);
			 RX_Scan.level=Math.floor(Math.min(90,pos_mouse));
			 
			 if((RX_Scan.areas[RX_Scan.idx].Fmax-RX_Scan.areas[RX_Scan.idx].Fmin)<10000) {
				 RX_Scan.areas.splice(RX_Scan.idx,1); //Remove, too small
				 RX_Scan.idx=-1;
			 }
		 }
		
		 Trace_Echelle();
		 Save_SDR_Para();
	}
}

function Stop_Move(){
	RX_Scan.idx=-1;	
}

//Affichage - Display
//**************
function Affich_freq_Audio_RX(){
	SDR_RX.Audio_RX=Math.floor(SDR_RX.centrale_RX+SDR_RX.fine);
	$("#Fsaisie").html(FkHz(SDR_RX.Audio_RX));
	Affich_freq_champs(SDR_RX.Audio_RX,"#FRX");
	$("#CentFreq").html(FkHz(SDR_RX.centrale_RX)+" kHz");
	if (ZoomFreq.id=="FRX") Affich_freq_champs(SDR_RX.Audio_RX,"#ZFr"); //Zoom display			
	Save_RX_Para();
	
}
function Affich_freq_champs(F,id){
	var Fr="*              "+F.toString();
	for (var i=1;i<=12;i++){
		$(id+i).html(Fr.substr(-i,1));
	}
}

function Affiche_Curseur(){
	var p=ecran.innerW*(0.5+SDR_RX.fine/(SDR_RX.bande))-10+ecran.border;
	$("#curseur").css("left",p);
}
function smetreClick(){
	S_metre.large=!S_metre.large;
	if (S_metre.large){
		$("#Smetre").css({"position": "fixed","top":"5%", "height": "30%", "font-size":"100px","border":"inset 4px white"	});
		$("#Smetre_label").css("font-size","18px");
		$("#Smetre_RC").css({"font-size":"100px","width":"250px"});
	}else {
		$("#Smetre").css({"position": "absolute","top":"0%", "height": "100%", "font-size":"20px","border":"0px"});
		$("#Smetre_label").css("font-size","8px");
		$("#Smetre_RC").css({"font-size":"20px","width":"50px"});
	}
	resize_Smetre();
}
function Echelle_dB_Spectre(){
	var ctx = document.getElementById("myEchSpectre").getContext("2d");
	ctx.lineWidth = 1;
	ctx.clearRect(0, 0,fenetres.spectreW,fenetres.spectreH);
	ctx.beginPath();
	ctx.strokeStyle = "#ffffff"; 
	ctx.setLineDash([1, 15]);
	for (var level=-32000;level<=32000;level=level+1000){ //Step 10db
		var Y=Math.floor(fenetres.spectreH*(1-visus.spectre_haut*(level+visus.spectre_bas)));
		if (Y>0 && Y<fenetres.spectreH){
			ctx.moveTo(0,Y);
			ctx.lineTo(fenetres.spectreW,Y);
		}
	}
	ctx.stroke();
}
function Affiche_ListeF(){
	//Trie liste
	var PasTrie=true;
	while (PasTrie&&Liste_F.length>1 ){
		PasTrie=false;
		for (var i=1;i<Liste_F.length;i++){
			if (Liste_F[i][0]<Liste_F[i-1][0]){
				PasTrie=true;
				var A=Liste_F[i-1];
				Liste_F[i-1]=Liste_F[i];
				Liste_F[i]=A;
			}
		}
	}
	//Affichage liste frequences
	var S="";
	for (var i=0;i<Liste_F.length;i++){
		if (SDR_RX.BandeRXmin<=Liste_F[i][0] && SDR_RX.BandeRXmax>= Liste_F[i][0]){
			if(Liste_F[i][2]) { //Liste perso
				S+='<div><div class="hover DSaisie" onclick="Dsaisie('+Liste_F[i][0]+',\''+Liste_F[i][1]+'\');" >x</div>';
			}else{
				S+="<div><div class='DSaisie' ></div>"
			}
			S+="<span class='hover' onclick='clickF("+i+");'>"+FkHz(Liste_F[i][0])+" "+Liste_F[i][1]+"</span></div>";
		}
	}
	$("#ListeF").html(S);
	Trace_Echelle();
}
function FkHz(Fr){
	Fr=Math.floor(Fr/1000).toString().trim();
	var F="";
	for (var p=1;p<=Fr.length;p++){
		F=Fr.charAt(Fr.length-p)+F;
		if (p==3 || p==6) F=" "+F;
	}
	return F;
}
function Ssaisie(){
	var V=$("#Tsaisie").val();
	var pat=/['"<>]/g;
	V=V.replace(pat," ");
	$("#Tsaisie").val("");
	Liste_F.push([SDR_RX.Audio_RX,V,true]);
	Liste_F_Perso.push([SDR_RX.Audio_RX,V]);
	Save_SDR_Para();
	Affiche_ListeF();
}
function Dsaisie(f,n){ //Delete one record
	for (var i=0;i<Liste_F.length;i++){
			if (Liste_F[i][0]==f&&Liste_F[i][1]==n){
				Liste_F.splice(i,1);
				break;
			}
	}
	for (var i=0;i<Liste_F_Perso.length;i++){
			if (Liste_F_Perso[i][0]==f&&Liste_F_Perso[i][1]==n){
				Liste_F_Perso.splice(i,1);
				break;
			}
	}
	Save_SDR_Para();
	Affiche_ListeF();
}


//ANCIENS PARAMETRES - OLD parameters stored locally in browser

function Recall_SDR_Para(){
	if (Local_Storage){ // On a d'anciens parametres en local
		console.log("Recall_SDR_Para(")
		Liste_F_Perso = JSON.parse(localStorage.getItem("Liste_F_Perso"));
		if (Liste_F_Perso.length>0){
			for (var i=0;i<Liste_F_Perso.length;i++){
				Liste_F.push([Liste_F_Perso[i][0],Liste_F_Perso[i][1],true]);
			}
		}
		Affich_freq_Audio_RX();
		Affiche_Curseur();
		RX_Scan = JSON.parse(localStorage.getItem("RX_Scan"));
		RX_Scan.idx=-1;
		Scan_status();
		Trace_Echelle();
	} 
}
function Save_SDR_Para(){
	localStorage.setItem("Liste_F_Perso", JSON.stringify(Liste_F_Perso));
	localStorage.setItem("RX_Scan", JSON.stringify(RX_Scan));
	localStorage.setItem("Local_Storage_", JSON.stringify(Version_Local_Storage));
}

function Recall_visus(){
	if (Local_Storage){
		visus = JSON.parse(localStorage.getItem("Visus"));
		$("#Spectre_average").prop("checked",visus.spectre_lisse);	
	}
}
function Save_visus(){
	visus.spectre_lisse=$("#Spectre_average").prop("checked");
	localStorage.setItem("Visus", JSON.stringify(visus));
}



//RESIZE
//**********
function window_resize(){
	//Recup waterfall
	var canvasWaterfall0 = document.getElementById("myWaterfall0");
	var ctxW0 = canvasWaterfall0.getContext("2d");
	var imgData0 = ctxW0.getImageData(0, 0, fenetres.waterW, fenetres.waterH);
	var P0 = $("#myWaterfall0").position();
	var canvasWaterfall1 = document.getElementById("myWaterfall1");
	var ctxW1 = canvasWaterfall1.getContext("2d");
	var imgData1 = ctxW0.getImageData(0, 0, fenetres.waterW, fenetres.waterH);
	var P1 = $("#myWaterfall1").position();
	ecran.largeur = window.innerWidth; // parametre qui gere le changement des css'
	ecran.hauteur = window.innerHeight;
	var Fs=Math.min(1,ecran.largeur/ecran.hauteur/1.6)*ecran.hauteur/50;
	if (ecran.largeur<=1300 || ecran.hauteur<=700) {
		ecran.large=false; 
		Fs=16;
	} else {	
	    ecran.large=true;
	}
	$("body").css("font-size",Fs);  //Main Font-Size
	$("#fen_oscillo input").css("height",Fs);  
	$("#fen_RX_main input").css("height",Fs);
	$("#fen_TX_main input").css("height",Fs);
	
	
	$("#spectre").css("border-width",ecran.border);
	$("#echelle").css("border-width",ecran.border);
	$("#echelle_track").css("left",ecran.border);
	$("#echelle_Label").css("left",ecran.border);
	$("#waterfall").css("border-width",ecran.border);
	ecran.innerW=$("#spectre").innerWidth();
	fenetres.spectreW=$("#spectre").innerWidth();
	fenetres.spectreH=Math.floor($("#spectre").innerHeight());
	fenetres.waterW=$("#waterfall").innerWidth();
	fenetres.waterW=FFT;
	fenetres.waterH=Math.floor($("#waterfall").innerHeight());
	var Canvas='<canvas id="myEchSpectre"  width="'+fenetres.spectreW+'" height="'+fenetres.spectreH+'" ></canvas>';
	$("#EchSpectre").html(Canvas);
	var Canvas='<canvas id="myWaterfall0" class="myWaterfall" width="'+fenetres.waterW+'" height="'+fenetres.waterH+'" ></canvas>';
	Canvas=Canvas+'<canvas id="myWaterfall1" class="myWaterfall" width="'+fenetres.waterW+'" height="'+fenetres.waterH+'" ></canvas>';
	$("#waterfall_in").html(Canvas);
	//Ecriture ancien Waterfall dans nouveau canvas
	canvasWaterfall0 = document.getElementById("myWaterfall0");
	ctxW0 = canvasWaterfall0.getContext("2d");
	ctxW0.putImageData(imgData0, 0, 0);
	$("#myWaterfall0").css("top",P0.top);
	canvasWaterfall1 = document.getElementById("myWaterfall1");
	ctxW1 = canvasWaterfall1.getContext("2d");
	ctxW1.putImageData(imgData1, 0, 0);
	$("#myWaterfall1").css("top",P1.top);
	$("#echelle").html('<canvas id="myEchelle" width="'+ecran.innerW+'" height="43" ></canvas>');
	Trace_Echelle();
	Affiche_Curseur();
	$("#Oscillo").html('<canvas id="myOscillo" width="'+$("#Oscillo").innerWidth()+'" height="'+$("#Oscillo").innerHeight()+'" ></canvas>');
	$("#Audio_RX_T").html('<canvas id="myAudio_RX_T" width="'+$("#Audio_RX_T").innerWidth()+'" height="'+$("#Audio_RX_T").innerHeight()+'" ></canvas>');
	$("#Audio_RX_FFT").html('<canvas id="myAudio_RX_FFT" width="'+$("#Audio_RX_FFT").innerWidth()+'" height="'+$("#Audio_RX_FFT").innerHeight()+'" ></canvas>');
	$("#zSpectre").html('<canvas id="zcSpectre" width="'+$("#zSpectre").innerWidth()+'" height="'+$("#zSpectre").innerHeight()+'" ></canvas>');
	visus_click_slider("paraSpectre",false);
	visus_click_slider("paraWater",false);
    resize_Smetre();
	Echelle_dB_Spectre();
}
function resize_Smetre(){
	var Ws=$("#Smetre_fond").innerWidth();
	var Hs=Math.max($("#Smetre_fond").innerHeight(),Ws);
	var Wr=0.8*Ws;
	var Hr=Math.max(0.8*Hs,Hs-$("#Smetre_fond").innerHeight()/4);;
	$("#Smetre_fond").html('<canvas id="EchSmetre"  width="'+Ws+'" height="'+Hs+'" ></canvas>');
	var ctx = document.getElementById("EchSmetre").getContext("2d");
	ctx.lineWidth = 5;
	ctx.beginPath();
	S_metre.teta=Math.asin(Wr/(1.8*Hr));
	ctx.strokeStyle = "white";
	ctx.arc(Ws/2, Hs, Hr, -Math.PI/2-S_metre.teta, -Math.PI/2+S_metre.teta/5); //cercle
	ctx.stroke();
	ctx.beginPath();
	ctx.strokeStyle = "orange";
	ctx.arc(Ws/2, Hs, Hr, -Math.PI/2+S_metre.teta/5, -Math.PI/2+S_metre.teta); //cercle
	ctx.stroke();
	ctx.beginPath();
	ctx.lineWidth = 2;
	ctx.font = "8px Arial";
	ctx.strokeStyle = "white";
	var Slabel="";
	for (var level=0;level<=50;level=level+10){ //Step 10db
			var t=level*2*S_metre.teta/50-S_metre.teta;
			var X1=Ws/2+Hr*Math	.sin(t);
			var Y1=Hs-Hr*Math.cos(t);
			var X2=Ws/2+(Hr+10)*Math.sin(t);
			var Y2=Hs-(Hr+10)*Math.cos(t);
			ctx.moveTo(X1,Y1);
			ctx.lineTo(X2,Y2);
			Slabel+='<div style="top:'+Y2+'px;left:'+X2+'px;transform:rotate('+t+'rad);">'+level+" dB"+'</div>';
	}
	ctx.stroke();
	$("#Smetre_label").html(Slabel);
	$("#SM_fleche").css("height",2*Hr+"px");
	$("#SM_fleche").css("top",(Hs-Hr)+"px");
}
function Init_Sliders(){
		$( function() {
			$( "#slider_bande_RX" ).slider({
			  value:SDR_RX.idx_bande,
			  min: 0,
			  max: bandes.length-1,
			  step: 1,
			  slide: function( event, ui ) {
				 SDR_RX.idx_bande=ui.value;
				choix_bande();
				Recal_Freq_centrale();
				Save_RX_Para();
			  }
			});
		  } );
	  $( function() {
		$( "#slider_Frequence_centrale_RX" ).slider({ 
		  value:SDR_RX.centrale_RX,
		  min: SDR_RX.BandeRXmin,
		  max: SDR_RX.BandeRXmax,
		  step: 10000,
		  slide: function( event, ui ) {
			 var old_frequence_centrale_RX=SDR_RX.centrale_RX;
			 SDR_RX.centrale_RX=ui.value;
			 SDR_RX.fine=SDR_RX.fine-SDR_RX.centrale_RX+old_frequence_centrale_RX; //On essaye conserver
			 var deltaF=(SDR_RX.bande)/2.1;
			 SDR_RX.fine=Math.max(SDR_RX.fine,-deltaF);
			 SDR_RX.fine=Math.min(SDR_RX.fine,deltaF);
			 GPredictRXcount = -6;
			 choix_freq_fine();
			 choix_freq_central();
			 Affiche_Curseur();
			 Save_RX_Para();
		  }
		});
	  } );
	 $( function() {
		$( "#slider_Spectre_haut" ).slider({
		  min:0.00005 ,
		  max: 0.0007,
		  step: 0.00001,
		  value:  visus.spectre_haut,
		  slide: function( event, ui ) {
			visus.spectre_haut = ui.value ;
			Save_visus();
			Echelle_dB_Spectre();
		  }
		});
	  } );
	  $( function() {
		$( "#slider_Spectre_bas" ).slider({
		  min:-7000 ,
		  max: 3000,
		  step:10,
		  value:  visus.spectre_bas,
		  slide: function( event, ui ) {
			visus.spectre_bas = ui.value ;
			Save_visus();
			Echelle_dB_Spectre();
		  }
		});
	  } );
	   $( function() {
		$( "#slider_Water_haut" ).slider({
		  min:0.00005 ,
		  max: 0.0007,
		  step: 0.00001,
		  value:  visus.water_haut,
		  slide: function( event, ui ) {
			visus.water_haut = ui.value ;
			Save_visus();
		  }
		});
	  } );
	  $( function() {
		$( "#slider_Water_bas" ).slider({
		  min:-7000 ,
		  max: 3000,
		  step:10,
		  value:  visus.water_bas,
		  slide: function( event, ui ) {
			visus.water_bas = ui.value ;
			Save_visus();
		  }
		});
	  } );
	$( function() {
		$( "#slider_Vol_RX" ).slider({
		  min:-30 ,
		  max: 10,
		  step:1,
		  value: 20* Math.log(SDR_RX.VolAudio)/Math.LN10,
		  slide: function( event, ui ) {
			SDR_RX.VolAudio=Math.pow(10,ui.value/20)  ; //dB
		  }
		});
	  } );
	  $( function() {
		$( "#slider_Vol_RXTX" ).slider({
		  min:-40 ,
		  max: 0,
		  step:0.1,
		  value: 20* Math.log(SDR_RX.VolAudinTX)/Math.LN10 , 
		  slide: function( event, ui ) {
			SDR_RX.VolAudinTX= Math.pow(10,ui.value/20)  ; //dB
		  }
		});
	  } );
	  $( function() {
		  var Vmax=50; //Gain Max RTL-SDR
		  var Vstep=1;
		  if (SDR_RX.sdr =="hackrf"){
			  Vmax=10;Vstep=10; // 2 gains only
		  }
		  if (SDR_RX.sdr =="pluto") Vmax=72;
		  Gain_RX.RF=Math.min(Gain_RX.RF,Vmax); 
		$( "#slider_GRF_RX" ).slider({
		  min:0 ,
		  max: Vmax,
		  step:Vstep,
		  value:  Gain_RX.RF,
		  slide: function( event, ui ) {
			Gain_RX.RF= ui.value ;
			choix_GainRX();
		  }
		});
	  } );
	  $( function() {
		$( "#slider_GIF_RX" ).slider({
		  min:0 ,
		  max: 40,
		  step:4,
		  value:  Gain_RX.IF,
		  slide: function( event, ui ) {
			Gain_RX.IF= ui.value ;
			choix_GainRX();
		  }
		});
	  } );
	  $( function() {
		$( "#slider_GBB_RX" ).slider({
		  min:0 ,
		  max: 60,
		  step:2,
		  value:  Gain_RX.BB,
		  slide: function( event, ui ) {
			Gain_RX.BB= ui.value ;
			choix_GainRX();
		  }
		});
	  } );
	  $( function() {
		$( "#slider_Filtre_RX" ).slider({
		  range: true,
		  min: 100,
		  max: 4000,
		  values: [ audioRX_PB.F1, audioRX_PB.F2 ],
		  slide: function( event, ui ) {
			audioRX_PB.F1=ui.values[ 0 ];
			audioRX_PB.F2=ui.values[ 1 ];
			Choix_PB_RX();
			Save_RX_Para();
		  }
		});		
	  } );
	  $( function() {
		$( "#slider_squelch" ).slider({
		  min: -90,
		  max: 0,
		  value: SDR_RX.squelch,
		  slide: function( event, ui ) {
			SDR_RX.squelch=ui.value;
			choix_mode();
			click_squelch();
		  }
		});		
	  } );
}
 //Animations windows sliders
 //***************************
function visus_click_slider(t,anim){
    var x = $("#"+t).position();
	var w=$("#"+t).parent().width();
	var h=$("#"+t).parent().height();
	if (x.left<w/2+10  || !anim) { // Bloc Rentre
	         setTimeout(function(){ fenetres.para_visus_visible=false; }, 200);
			if (anim) {
				$("#"+t).animate({
					left: w-28, top:h-28  
				});
			} else {
				$("#"+t).css("top",h-28);$("#"+t).css("left",w-28);
			}
			$("#"+t+"_fleche").css("background-image"," url('/css/Image/fleche_NW.png')");
	} else { //Bloc sort
	        fenetres.para_visus_visible=true;
			$("#"+t).animate({
				left: w/3, top:h/5  
			});			
			$("#"+t+"_fleche").css("background-image"," url('/css/Image/fleche_SE.png')");
	}
}

// Initialisation SDR
// *****************

function Init_Page_SDR(){
	console.log("Init_Page_SDR()");
	$("#f1atb").html(Version);
	//RX Bandes
	var S='<label for="bandSelectRX">HF band:</label>';
	S+='<select name="bandSelectRX" id="bandSelectRX" onchange="newBandRX(this);">';
	for (var i=0;i<BandesRX.length;i++){
		S+='<option value='+i+'>'+BandesRX[i][2]+'</option>';
		RX_Xtal_Errors[i]=0;
	}
	S+='</select>';
	$("#BandeRX").html(S);
	window_resize();
	
	//Local Storage
	if (localStorage.getItem("Local_Storage_")!=null){ // We have an old storage
		var VersionOldStorage =  JSON.parse(localStorage.getItem("Local_Storage_"));
		if (Version_Local_Storage == VersionOldStorage) Local_Storage = true;
	}
	
	Recall_RX_Para();
	Recall_SDR_Para();
	Recall_visus();
	
	choixBandeRX();
	$("#BandeRX option[value='"+SDR_RX.bandeRX+"']").prop('selected', true);
	Init_Sliders();
	Init_champs_freq("FRX","#Frequence_AudioRX");
	Init_champs_freq("OFS","#offset");
	Init_champs_freq("DOF","#Xtal_Error");
	Init_champs_freq("SFr","#SDR_Freq");
	Init_champs_freq("ZFr","#zoom_freq_in");
	//MouseWheel
	$('#visus').on('mousewheel', function(event){ Mouse_Freq(event)});
	for (var i=1;i<13;i++){
		$('#FRX'+i).on('mousewheel', function(event){ Mouse_Freq_audioRX(event)});
		$('#FRX'+i).on('click', function(event){ OpenZoomFreq(event)});
		$('#DOF'+i).on('mousewheel', function(event){ Mouse_deltaOffset(event)});
		$('#DOF'+i).on('click', function(event){ OpenZoomFreq(event)});
		$('#ZFr'+i).on('mousewheel', function(event){ Mouse_Zoom_Freq(event)});
		$('#ZFr'+i).on('touchmove', function(event){ Touch_Zoom_Freq(event)});
		$('#ZFr'+i).on('touchstart', function(event){ StartTouch_Zoom_Freq(event)});
	}
	$('#zoom_freq').on('mousewheel', function(event){ event.stopPropagation()});
	$('#zoom_freq').on('touchmove', function(event){ event.stopPropagation()});
	Affich_freq_champs(0,"#ZFr");
	$('body').on('keydown', function(event){Keyboard_Freq(event)});
	
	//Curseur Frequence Audio RX et Scan
	dragCurseur();
	dragScanZone();
	// Liste Frequences clé
	for (var i=0;i<Label.length;i++){
		Liste_F.push([Label[i][0],Label[i][1],false]);
	}
	Affiche_ListeF();
	
	
	//Init IP
	var MyIP=window.location.hostname;
	if (SDR_RX.IP== ""){ //Premier demarrage
		SDR_RX.IP=MyIP;
		$("#fen_Par").css("display","block");  //On ouvre la page parametres
		
	}	
	$("#RX_IP").val(SDR_RX.IP);
	if (SDR_RX.IP.length>3) {
		Set_RX_GPIO();
		setInterval("Trace_Audio();",40);
	} 
	disp_CPU(SDR_RX.IP,"RX_CPU");
}
function disp_CPU(ip,id){	
	if (ip.length>3) {
		var url_="http://"+ip+"/log/CPU.js";
		var s = document.createElement("script");
		s.setAttribute("type", "text/javascript");
		s.setAttribute("src", url_);
		s.setAttribute("onload", " DISP_CPU_('"+ id +"' ,CPU_Model);");
		document.body.appendChild(s);
	}
}
function DISP_CPU_(id, cpu){
	CPU_Models.push([id, cpu]);
	for (var i=0;i<CPU_Models.length;i++){
		$("#"+CPU_Models[i][0]).html("&nbsp;&nbsp;&nbsp;CPU : " + CPU_Models[i][1]);
	}
}
function Init_champs_freq(id,idParent){
	//DIV Afficheurs Frequence
	var s="";
	for (var i=0;i<13;i++){
		s="<div id='"+id+i+"'></div>"+s;
	}
	$(idParent).html(s);
	$("#"+id+"0").html("Hz");
}
function choixBandeRX(){	//Suivant freq centrale RX defini les limites
	for (var i=0;i<BandesRX.length;i++){
		if (BandesRX[i][0]<=SDR_RX.centrale_RX && BandesRX[i][1]>=SDR_RX.centrale_RX) {
			SDR_RX.bandeRX=i;
			SDR_RX.BandeRXmin=BandesRX[i][0];
			SDR_RX.BandeRXmax=BandesRX[i][1];
			SDR_RX.Xtal_Error=RX_Xtal_Errors[i];
		}
	}
	ListRelay();
}
function newBandRX(t){
	SDR_RX.centrale_RX=Math.floor((BandesRX[t.value][0]+BandesRX[t.value][1])/2);
	SDR_RX.fine=Math.min(BandesRX[t.value][1]-SDR_RX.centrale_RX,SDR_RX.fine);
	SDR_RX.fine=Math.max(BandesRX[t.value][0]-SDR_RX.centrale_RX,SDR_RX.fine);
	choixBandeRX();
	$("#slider_Frequence_centrale_RX").slider("option", "min",  SDR_RX.BandeRXmin);
	$("#slider_Frequence_centrale_RX").slider("option", "max", SDR_RX.BandeRXmax);
	$("#slider_Frequence_centrale_RX").slider("option", "value",  SDR_RX.centrale_RX);
	choix_freq_central();
	GPredictRXcount = -6;
	choix_freq_fine();
	Affiche_Curseur();
	Affiche_ListeF();
	if (SDR_TX.TXeqRX) rxvtx();
}

// FREQUENCY Cursor
//*****************
function Mouse_Freq(ev){
	GPredictRXcount = -6; //To freeze doppler correction few seconds
	var step=RX_modes[SDR_RX.mode][2];
	SDR_RX.fine = SDR_RX.fine+step*ev.deltaY;
	choix_freq_fine();
	Affiche_Curseur();
}
function Mouse_Freq_audioRX(ev){ //modif des digits
	var p=parseInt(ev.target.id.substr(3))-1;
	var deltaF=ev.deltaY*Math.pow(10,p);
	Recal_fine_centrale(deltaF);
}
function Keyboard_Freq(ev){
	var actif=document.activeElement.tagName;
	
	if (actif != "INPUT" &&  actif != "SPAN") { //To reject input fiels and sliders
		GPredictRXcount = -6;
		var step=RX_modes[SDR_RX.mode][2];
		if(ev.keyCode == 37 ) SDR_RX.fine = SDR_RX.fine-step;
		if(ev.keyCode == 39 ) SDR_RX.fine = SDR_RX.fine+step;
		choix_freq_fine();
		Affiche_Curseur();
	}
}

function Recal_fine_centrale(deltaF){
	var newFreq=SDR_RX.Audio_RX+deltaF;
	GPredictRXcount = -6;
	if (newFreq>SDR_RX.min+10000 && newFreq<SDR_RX.max-10000){ // On bouge la frequence fine
		SDR_RX.fine=SDR_RX.fine+deltaF;
		choix_freq_fine();
		
	} else { //gros saut en frequence
		SDR_RX.centrale_RX=SDR_RX.centrale_RX+deltaF;
		choix_freq_central();
	}
	Affiche_Curseur();
}
function Recal_Freq_centrale(){
	SDR_RX.min=parseInt(SDR_RX.centrale_RX)-SDR_RX.echant/2/bandes[SDR_RX.idx_bande][2];
	SDR_RX.max=parseInt(SDR_RX.centrale_RX)+SDR_RX.echant/2/bandes[SDR_RX.idx_bande][2];
	SDR_RX.bande=SDR_RX.max-SDR_RX.min; // Bande exacte à l'ecran
	console.log("SDR_RX.bande",SDR_RX.bande);
	if (SDR_RX.Audio_RX<SDR_RX.min+10000 || SDR_RX.Audio_RX>SDR_RX.max-10000){ //  frequence audio en dehors
		SDR_RX.fine=0;
		SDR_RX.centrale_RX=SDR_RX.Audio_RX;	
		
	}
	Trace_Echelle();
	GPredictRXcount = -6;
	choix_freq_fine();
	choix_freq_central();
	Affiche_Curseur();
}
function OpenZoomFreq(ev){
	ZoomFreq.id=ev.target.id.substr(0, 3);
	var T=ZoomFreq.id;
	var F=0;
	if (ZoomFreq.id=="FRX") {
		F=SDR_RX.Audio_RX;
		var T="RX Audio";
	}
	if (ZoomFreq.id=="DOF") {
		F=SDR_RX.Xtal_Error;
		var T="Manual Correction";
	}
	if (ZoomFreq.id=="FRT") { //Frequency TX
		F=SDR_TX.Freq;
		var T="TX Frequency";
	}
	if (ZoomFreq.id=="OFT") { //Offset TX
		F=SDR_TX.Offset;
		var T="TX Manual Correct.";
	}
	Affich_freq_champs(F,"#ZFr");
	$("#zoom_freq_title").html(T);
	$('#zoom_freq').css('display','block');
	$("body").css("height","100%"); //To freeze the scroll
	$("body").css("overflow","hidden");
}
function CloseZoomFreq(){
	$('#zoom_freq').css('display','none');
	$("body").css("height","auto");
	$("body").css("overflow","visible");
}
function Mouse_Zoom_Freq(ev){ //modif des digits du zoom
	var F=0;
	ev.stopPropagation();
	if (ZoomFreq.id=="FRX") {
			Mouse_Freq_audioRX(ev);
			F=SDR_RX.Audio_RX;
	}
	if (ZoomFreq.id=="DOF") {
			Mouse_deltaOffset(ev);
			F=SDR_RX.Xtal_Error;
	}
	if (ZoomFreq.id=="FRT") {
			Mouse_Freq_TX(ev);
			F=SDR_TX.Freq;
	}
	if (ZoomFreq.id=="OFT") {
			Mouse_deltaOffsetTX(ev);
			F=SDR_TX.Offset;
	}
	
	Affich_freq_champs(F,"#ZFr");
}
function StartTouch_Zoom_Freq(ev){
	if (ev.touches.length == 1) {
			ev.preventDefault();
			ZoomFreq.pos = ev.touches[0].clientY;
	}
}
function Touch_Zoom_Freq(ev){ //modif des digits
	var p=parseInt(ev.target.id.substr(3))-1;
	var F=0;
	ev.stopPropagation();
	if (ev.touches.length == 1) {
			ev.preventDefault();
			var pos=ev.touches[0].clientY;
			var deltaFreq = Math.pow(10,p)*Math.sign(ZoomFreq.pos-pos);
			ZoomFreq.pos=pos;
			if (ZoomFreq.id=="FRX") {
				Recal_fine_centrale(deltaFreq);
				F=SDR_RX.Audio_RX;
			}
			if (ZoomFreq.id=="DOF") {
				Recal_deltaOffset(deltaFreq);
				F=SDR_RX.Xtal_Error;
			}
			if (ZoomFreq.id=="FRT") {
				Recal_FTX(deltaFreq);
				F=SDR_TX.Freq;
			}
			if (ZoomFreq.id=="OFT") {
				Recal_OFT(deltaFreq);
				F=SDR_TX.Offset;
			}
			Affich_freq_champs(F,"#ZFr");
	}
}
function Mouse_deltaOffset(ev){ //modif des digits
	var p=parseInt(ev.target.id.substr(3))-1;
	var deltaF=ev.deltaY*Math.pow(10,p);
	Recal_deltaOffset(deltaF);
}
function Recal_deltaOffset(deltaF){
	SDR_RX.Xtal_Error=Math.floor(SDR_RX.Xtal_Error+deltaF);
	RX_Xtal_Errors[SDR_RX.bandeRX]=SDR_RX.Xtal_Error;
	choix_freq_central();
	Affiche_Curseur();
}
function dragCurseur() {
	var idCurseur =document.getElementById("curseur");
	var pos1 = 0,  pos3 = 0, posDiv=0;
	idCurseur.onmousedown = dragMouseDown;
	idCurseur.addEventListener('touchmove', onTouchMove, false);
	idCurseur.addEventListener('touchstart', onTouchStart, false);
	function dragMouseDown(e) {	 
		e = e || window.event;
		e.preventDefault();
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		idCurseur.style.left=(pos3-10)+"px";
		posDiv=parseFloat(idCurseur.style.left);
		document.onmouseup = closeDragElement;
		document.onmousemove = elementDrag;
	}
	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		pos1 = pos3 - e.clientX;   
		pos3 = e.clientX;
		posDiv=posDiv-pos1;	
		idCurseur.style.left=posDiv+"px";
		var new_pos=posDiv+10-ecran.border;
		SDR_RX.fine=Math.floor(SDR_RX.min+(SDR_RX.bande)*new_pos/ecran.innerW -SDR_RX.centrale_RX);
		GPredictRXcount = -6;
		choix_freq_fine();
	}
	function closeDragElement() { 
	   document.onmouseup = null;
	   document.onmousemove = null;	
	}
	function onTouchStart(ev) {
		if (ev.touches.length == 1) {
			ev.preventDefault();
			pos3 = ev.touches[0].clientX;
			posDiv=parseFloat(idCurseur.style.left);
		}
	}
	function onTouchMove(ev) {
		if (ev.touches.length == 1) {
			ev.preventDefault();
			pos1 = pos3  - ev.touches[0].clientX;  
			pos3 = ev.touches[0].clientX;
			posDiv=posDiv-pos1;
			idCurseur.style.left=posDiv+"px";			
			var new_pos=posDiv+10-ecran.border;
			SDR_RX.fine=Math.floor(SDR_RX.min+(SDR_RX.bande)*new_pos/ecran.innerW -SDR_RX.centrale_RX);
			GPredictRXcount = -6;
			choix_freq_fine();
		}
	}
}
function clickFreq(e){
	 e = e || window.event;
	if (!fenetres.para_visus_visible){
			e.preventDefault();
			// calculate the new cursor position:
			var new_pos =  e.clientX-ecran.border;
			SDR_RX.fine=Math.floor(SDR_RX.min+(SDR_RX.bande)*new_pos/ecran.innerW -SDR_RX.centrale_RX);
			GPredictRXcount = -6;
			choix_freq_fine();
			Affiche_Curseur();
	}
}
function dragScanZone() {
	var idCurseur =document.getElementById("Scan_Zone");
	var pos1 = 0,  pos3 = 0, posDiv=0;
	idCurseur.addEventListener('touchmove', SZonTouchMove, false);
	idCurseur.addEventListener('touchstart', SZonTouchStart, false);
	
	function SZonTouchStart(ev) {
		if (ev.touches.length == 1) {
			ev.preventDefault();
			pos3 = ev.touches[0].clientY;
			posDiv=parseFloat(idCurseur.style.top);
		}
	}
	function SZonTouchMove(ev) {
		if (ev.touches.length == 1) {
			ev.preventDefault();
			pos1 = pos3  - ev.touches[0].clientY;  
			pos3 = ev.touches[0].clientY;
			posDiv=posDiv-pos1;
			idCurseur.style.top=posDiv+"px";			
			RX_Scan.level = 100*posDiv/fenetres.spectreH;
			RX_Scan.level = Math.max(0,RX_Scan.level);
			if (RX_Scan.level>90) {
				RX_Scan.areas.splice(0, RX_Scan.areas.length); // Clear all zones
				RX_Scan.level=50;
			}
			RX_Scan.level=Math.floor(Math.min(90,RX_Scan.level));
		}
	}
}
function clearRX(){ //Set frequenci to the closest kHz
	SDR_RX.Audio_RX=10000*Math.floor(SDR_RX.Audio_RX/10000+0.5);
	SDR_RX.fine=SDR_RX.Audio_RX-SDR_RX.centrale_RX;
	GPredictRXcount = -6;
	choix_freq_fine();
	Affiche_Curseur();
}
function clickF(i){ //Liste frequences en mémoire
	var deltaF=Liste_F[i][0]-SDR_RX.Audio_RX
	Recal_fine_centrale(deltaF)
}
function Flabel(f,e){
	e = e || window.event;
	e.stopPropagation();
	SDR_RX.Audio_RX=f;
	SDR_RX.fine=SDR_RX.Audio_RX-SDR_RX.centrale_RX;
	GPredictRXcount = -6;
	choix_freq_fine();
	Affiche_Curseur();
}

// IP check
// **********
function ValideIP(){
	var V=$("#RX_IP").val().trim();
	if (V.length<4) V="";
	SDR_RX.IP=V;
	$("#RX_IP").val(V)
	var V=$("#TX_IP").val().trim();
	if (V.length<4) V="";
	SDR_TX.IP=V;
	$("#TX_IP").val(V);
	
	$("#RX_ports").html("Ports: 80, "+Port_socket+","+(Port_socket+1)+","+(Port_socket+2));
	$("#TX_ports").html("Ports: 80, "+(Port_socket+3)+","+(Port_socket+4));
	SDR_RX.sdr = $("input[name='RXsdr']:checked").val();
	SDR_TX.sdr = $("input[name='TXsdr']:checked").val();
	Save_RX_Para();
	Save_TX_Para();
}

// Drawing
//**********

function Dessine_Tableau(canvas_ID,tableau,SR,Fmax) { // dessine une onde (tableau de bytes) dans le canvas
	var canvas = document.getElementById(canvas_ID);
	var ctx = canvas.getContext("2d");
	var Largeur = canvas.width;
	var Hauteur = canvas.height;
	ctx.clearRect(0, 0, Largeur, Hauteur);
    ctx.fillStyle = '#000030'; 
    ctx.fillRect(0, 0, Largeur, Hauteur);
    ctx.font = "9px Arial";
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'white';
	ctx.fillStyle = 'white';
    ctx.beginPath();
    var longT=tableau.length;
	if (Fmax>0) { // C'est une FFT. On limite l'axe des F
		longT=Math.floor(longT*2*Fmax/SR);
		var FMX=Fmax/1000;
		for(var f = 0; f < FMX; f++) { //Trace Axe des freq
		   var x = Largeur*f/FMX;
		  ctx.moveTo(x, Hauteur);
		  ctx.lineTo(x, 0.95*Hauteur);
		  ctx.fillText(f, x, 0.95*Hauteur);
		}
		ctx.fillText("kHz", Largeur*0.95, 0.95*Hauteur);
	} else { //temporelle
		longT=Math.floor(longT/10); //On prend peu d'echantillons pour dilater axe X
	}
  var sliceWidth = Largeur / longT;
  var x = 0;
  var Vtop=0;
  var Itop=0;
      for(var i = 0; i < longT; i++) {
        var v = tableau[i] / 128.0;
        var y = Hauteur-1-v * Hauteur/2;
		if (v>Vtop){ //Recherche du max
			Vtop=v;
			Itop=i;
		}
        if(i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
	   ctx.stroke();
	  ctx.beginPath();
	  ctx.font = "12px Arial";
	  if (Fmax>0) { // C'est une FFT. On affiche le max
		var I=Itop;
		if (Itop>1 && Itop<longT-2) { //Recherche X par interpollation
			I=Itop+(tableau[Itop+1]-tableau[Itop-1])/(1+tableau[Itop])*0.5;
		}
		var Ftop=Math.floor(I*Fmax/longT);
			  ctx.fillText(Ftop+"Hz", 0.05*Largeur, 0.25*Hauteur);
		}
      ctx.stroke();
    };
	


//Page FULL SCREEN
//****************
var FS_On =false;
function switch_page(){
	FS_On=!FS_On;
	var elem = document.documentElement;
	if (FS_On) {
			/* View in fullscreen */		
			  if (elem.requestFullscreen) {
				elem.requestFullscreen();
			  } else if (elem.mozRequestFullScreen) { /* Firefox */
				elem.mozRequestFullScreen();
			  } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
				elem.webkitRequestFullscreen();
			  } else if (elem.msRequestFullscreen) { /* IE/Edge */
				elem.msRequestFullscreen();
			  }
	} else {	
/* Close fullscreen */
			  if (document.exitFullscreen) {
				document.exitFullscreen();
			  } else if (document.mozCancelFullScreen) { /* Firefox */
				document.mozCancelFullScreen();
			  } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
				document.webkitExitFullscreen();
			  } else if (document.msExitFullscreen) { /* IE/Edge */
				document.msExitFullscreen();
			  }
	}
}
console.log("End loading remote_SDR.js");