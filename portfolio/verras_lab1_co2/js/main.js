/*CVERRAS 2020 */
//set up leaflet map
const mymap = L.map('mapid').setView([21.24, 15.75], 2);
//pull in tile layers and add to map
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 10,
    minZoom: 2,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoidmVycmFzY3V3IiwiYSI6ImNrODF6MWFubDBienMzZXBjeXV1ZDI4cDAifQ.YB4jrxVgL2wc5vtGtkaypw'
}).addTo(mymap);
//Import CO2 GeoJSON data
function getData(map){
    //load the data
    $.ajax("data/CO2.geojson", {
        dataType: "json",
        success: function(response){
        }
    }).done(function(data) {
      //setup functions that will run upon success
      var info = processData(data);
      createPropSymbols(info.timestamps, data);
      createLegend(info.min,info.max);
      createSliderUI(info.timestamps);
      //createSequenceControls(mymap,info.timestamps)
      createFilterButton(mymap);
    }).fail(function() { alert("There has been a problem loading the data.")});
};
//bring in coal data for overlay/5th interactive element
function getCoalData(map){
    $.ajax("data/coalPlants.geojson",{
    dataType:"json",
    success: function(response){
    }
  }).done(function(data){
    createCoalSymbols(data);
  }).fail(function() { alert("There has been a problem loading the coal data.")});
};
//process data for other functions
function processData(data) {
  //this would return the first row of data
  //var properties = data.features[0].properties;
  //empty array to hold all years of data
  var timestamps = [];
  var min = Infinity;
  var max = -Infinity;
  //loop through to fill array and min/max value
  for (var feature in data.features) {
    var properties = data.features[feature].properties;
    for (var attribute in properties) {
      //remove years that have no data for some reason
      if (attribute != '2017' &&
      attribute != '2018' &&
      attribute != '2019' && attribute != '2020'
      && attribute != 'Country Name' && attribute != 'name' && attribute != 'desc'
      && attribute != 'color' && attribute != 'source' && attribute != 'precision') {
        if ( $.inArray(attribute,timestamps) === -1) {
          timestamps.push(attribute);
        }
        if (properties[attribute] < min) {
          min = properties[attribute];
        }

        if (properties[attribute] > max) {
          max = properties[attribute];
        }
      }
    }
  }
  //console.log(timestamps);
  //return variables for use by other functions
  return {
    timestamps: timestamps,
    min:min,
    max:max
  }
};
//new create prop symbols for CO2 data
function createPropSymbols(timestamps, data, map){
  //create for additional overlays
  //var myData = L.layerGroup([]);
  countries = L.geoJson(data, {
    pointToLayer: function(feature, latlng) {
      return L.circleMarker(latlng, {
        fillColor: "#C02C02",
        color: '#000000',
        weight: 1,
        fillOpacity: 0.7
      }).on({
        //shows user where they've already explored by taking away the black outline
        mouseover: function(e) {
          this.openPopup();
          this.setStyle({color: 'darkred'});
        },
        mouseout: function(e) {
          this.closePopup();
          this.setStyle({color: '#C02C02'});
        }
      });
    }
  }).addTo(mymap);
  /*var g7 = L.geoJson(data, {filter: belowMean});
  function belowMean(feature) {
    name = feature.properties.name;
    if (name === "Canada" || name === "Japan" || name === "United States" ||name ==="Italy" || name === "United Kingdom" || name === "Germany" || name === "France" ) return true
  };
  var overlays = {
    "All Countries": countries,
    "G7 Countries": g7
  };*/
  //L.control.layers(overlays).addTo(mymap);
  //myData.addLayer(countries);
  //myData.addTo(mymap);
  updatePropSymbols(timestamps[0]);
};
//create coal symbols
function createCoalSymbols(data, map){
  //create group layer for overlay interaction
  var coalGroup = L.layerGroup();
  //define coal data
  coal = L.geoJson(data, {
    pointToLayer: function(feature, latlng) {
      return L.circleMarker(latlng, {
        fillColor: "#36454f",
        color: "#000000",
        weight: 1,
        fillOpacity: 0.6
      });
    },
    //create popup for each feature
    onEachFeature: function (feature,layer) {
      var props = layer.feature.properties;
      popupContent = "<p><b>"+ props.name + ", "+props.countrylong+": </b> " + props.capacitymw + " MW</p>";
      layer.bindPopup(popupContent, { offset: new L.Point(0, -2)});
    }
  });
  //add coal data to layer group
  coal.addTo(coalGroup);
  //create overlay
  var overlay = {
    "Coal-Powered Plants Over 3000MW": coalGroup
  };
  //add overlay interaction to map
  L.control.layers(null,overlay).addTo(mymap);
};
//update prop symbols
function updatePropSymbols(timestamp) {
  //find topTen countries highest co2 data
  var topTen = [];
  countries.eachLayer(function(layer){
    var props = layer.feature.properties;
    //console.log(props);
    var radius = calcPropRadius(props[timestamp]);
    var popupContent = "<b>" + props.name + " in " + timestamp + "</b><br>" +
        "<i>" +  Number(props[timestamp]).toFixed(2)  + "</i> metric tons per capita</i>";
   //variables for impact equivalents
    var homes = 8.67;
    var acres = 0.77;
    //custom options to style popup
    var customOptions = {
      'className' : 'popupCustom',
      'offset': new L.Point(0,-radius)
    };
    var onClickContent = "<p>What is the impact?</p>"+popupContent + "<p>This is the equivalent of running " + (Number(props[timestamp])/homes).toFixed(1) + " home(s) worth of electricity per year, per person</p><p> OR </p>The carborn sequestered by "+ (Number(props[timestamp])/acres).toFixed(1) + " acre(s) of U.S. forest for a year per person</p>";
    var name = props.name;
    var emissions = Number(props[timestamp]).toFixed(2);
    //append each row to top Ten array
    topTen.push([emissions,name]);
    //sort array largest to smallest
    topTen.sort(function(a,b){return b[0]-a[0]});
    //create list of top ten
    var finalTen = topTen.slice(0,10);
    //console.log(finalTen);
    clickContent = "<b>Country with the highest emissions per capita in " + timestamp + ":</b><p>" + finalTen[0][1] + ": " + finalTen[0][0] + " metric tons</p>";
    layer.setRadius(radius);
    layer.bindPopup(popupContent, customOptions);
    layer.on({
      click: function (e){
        $('#panel').html(onClickContent);
        $('#controlpanel').html(clickContent);
      }
    });
  });
}
//Create sequence controls
/*
function createSequenceControls(attributes,map){
  //use of extend()
  var SequenceControl = L.Control.extend({
  options: {
      position: 'upperright'
    },
    onAdd: function(map) {
      //create the control container div with a particular class name
      var container = L.DomUtil.create('div', 'sequence-control-container');
      //...initialize other dom elements, add listeners, etc.
      //create range input element (slider)
      $("#controlpanel").append('<input class = "range-slider" type="range">');
      //add skip buttons
      $('#controlpanel').append('<button class = "skip" id="reverse">Reverse</button>');
      $('#controlpanel').append('<button class = "skip" id="forward">Skip</button>');
      //event listeners
      $(container).on('mousedown dblclick', function(e){
        L.DomEvent.stopPropagation(e);
      });
      //disable dragging
      container.addEventListener('mouseover',function(){
        map.dragging.disable();
      });
      //re-enable dragging
      container.addEventListener('mouseout', function(){
        map.dragging.enable();
      });
      return container;
    }
  });
  map.addControl(new SequenceControl());
  //set slider attributes
  $('.range-slider').attr({
    max: 7,
    min: 0,
    value: 0,
    step: 1
  });
  //replace buttons with images here
  //click listener for buttons
  $('.skip').click(function(){
    //get the old index value
    var index = $('range-slider').val();

    //increment or decrement
    if ($(this).attr('id') == 'forward'){
      index++;
      //if past the last attribute
      index = index > 7 ? 0 : index;
    } else if ($(this).attr('id') == 'reverse'){
      index--;
      //if passed the first att
      index = index < 0 ? 7 : index;
    };
    //update slider
    $('.range-slider').val(index);
    //update symbols
    updatePropSymbols($(this).val().toString());
    updateLegend(attributes[index]);

  });
}
*/
//calculate radius for symbols and legend
function calcPropRadius(attValue) {
  //scale factor to adjust symbol size evenly
  var scaleFactor = 18;
  //area based on attribute value and scale factor
  var area = attValue * scaleFactor;
  //radius calculated based on area
  var radius = Math.sqrt(area/Math.PI)*2;

  return radius;
};
//create legend
function createLegend(min,max) {
  if (min <2) {
    min = 2;
  }
  //console.log(min);
  function roundNumber(inNumber){
    return (Math.round(inNumber/10)*10);
  }
  var legend = L.control( { position: 'bottomleft'});
  legend.onAdd = function(map) {
    //create the legend container
    var legendContainer = L.DomUtil.create("div", "legend");
    //create the symbol container within
    var symbolsContainer = L.DomUtil.create("div", "symbolsContainer");
    //classes from the processData function
    var classes = [(min).toFixed(1), ((max-min)/2).toFixed(1), ((max)).toFixed(1)];
    //console.log(classes);
    var legendCircle;
    var lastRadius = 0;
    var currentRadius;
    var margin;
    //event listner
    L.DomEvent.addListener(legendContainer, 'mousedown', function(e) {
      L.DomEvent.stopPropagation(e);
    });
    //add legend title
    $(legendContainer).append("<h2 id='legendTitle'>Carbon Emissions (metric tons)</h2>");
    //loop through to create min mean and max cirles
    for (var i = 0; i<= classes.length-1; i++) {
      legendCircle = L.DomUtil.create("div", "legendCircle");
      currentRadius = calcPropRadius(classes[i]);
      //console.log(currentRadius);
      margin = -currentRadius - lastRadius - 2;
      //circle style
      $(legendCircle).attr("style", "width: " + currentRadius*2 +"px; height: "+
                            currentRadius*2+ "px; margin-left: " + margin + "px;");
      //append legend descriptions to legend
      $(legendCircle).append("<span class='legendValue'>"+classes[i]+" metric tons/capita</span>");
      //append circles to legend
      $(symbolsContainer).append(legendCircle);
      lastRadius = currentRadius;
    }
    $(legendContainer).append(symbolsContainer);
    return legendContainer;
  };
  legend.addTo(mymap);
};
//create sliderUI original
function createSliderUI(timestamps) {
  var sliderControl = L.control({ position: 'bottomright'});
  sliderControl.onAdd = function(map) {
    //create the control container with a class Name
    var container = L.DomUtil.create('div', 'sequence-control-container');
    //create slider with class name
    var slider = L.DomUtil.create("input", "range-slider");
    //append slider to container
    $(container).append(slider);
    //append buttons
    //$(container).append('<button class = "skip" id="reverse">Reverse</button>');
    //$(container).append('<button class = "skip" id="forward">Skip</button>');
    //event listeners to prevent panning and clicking
    L.DomEvent.addListener(slider, 'mousedown', function(e) {
      L.DomEvent.stopPropagation(e);
    });
    $(slider).attr({
      'type':'range',
      'max': timestamps[timestamps.length-1],
      'min': timestamps[0],
      'step':1,
      'value': String(timestamps[0])
    }).on('input change', function() {
      updatePropSymbols($(this).val().toString());
      //updateLegend($(this).val().toString());
      $(".temporal-legend").text(this.value);
    });
    $(slider).mousedown(function (e) {
      map.dragging.disable();
    });
    $(slider).mouseup(function (e){
      map.dragging.enable();
    });
    return container;
    return slider;
  }
  sliderControl.addTo(mymap)
  createTemporalLegend(timestamps[0]);
}
//create filter buttons
function createFilterButton(map) {
  var buttonMean = L.control({ position: 'topright'});
  buttonMean.onAdd = function(map) {
    var button = L.DomUtil.create("button");
    L.DomEvent.addListener(button, 'click', function(e){
      L.DomEvent.stopPropagation(e);
    });
    $(button).attr({
      'text':'filter'
    }).on('input change', function(){

    })
  }
}
//create temporal legend
function createTemporalLegend(startTimestamp) {
  var temporalLegend = L.control({position: 'bottomright'});

  temporalLegend.onAdd = function(map) {
    var output = L.DomUtil.create("output", "temporal-legend");
    $(output).text(startTimestamp)
    return output;
  }
  temporalLegend.addTo(mymap);
}
$(document).ready(function(){
  getData(), getCoalData()});
