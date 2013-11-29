/**
    richpanorama.js - Rich Panorama Visualization
    Copyright (C) 2013 Rubén Béjar {http://www.rubenbejar.com/}
 */

function RichPanorama() {
    var RP = {};
  
    function privateFunction() {
    };
  
    var privateAttribute = 0;
  
  
    RP.position = new THREE.VEctor3(0,0,0);
    RP.rotation = 0;
    RP.image = '';
    RP.modelImage = ''; // Image that "mixes" 3d model and panorama
    RP.objects3d = new Array();
    
    var material = new THREE.MeshBasicMaterial( { color: 0x777700, opacity: 0.1, transparent: true} );
    
      
    
  
    RP.aFunction = function() {          
    };



    return RP;
};

//var richPanorama = RichPanorama();
