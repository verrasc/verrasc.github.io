//javascript
//GLOBAL VARIABLES//
//field names for Internet csv (county and tract)
var attrIntArray = ["total","hascomputer","dialup","broadband","nointernet","nocomputer"];
//field names for Unemployment csv(county and tract)
var attrUnempArray = ["totalpopover16","laborforceparticipationrate","unemploymentrate","popabove20underpovertylevel"];
//import csv using D3 method
internetCounties = d3.queue()
  .defer(d3.csv,"data/csvCountiesInternet.csv")
  .await(callback);

function callback(error, internetCounties){
  console.log(internetCounties);
  loadPage(internetCounties);
}
function loadPage(csvInternetCounties){
  console.log(csvInternetCounties);
    createMap('map1',csvInternetCounties)
    createDetroitMap('map2')
    //second case study map will go here
    createMap('map3')

    createPieChart()
}
function createMap(div, csvData){
  console.log(csvData);
    var map = L.map(div).setView([39.8283, -98.5795], 4);

    L.tileLayer(
        'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }).addTo(map);
    getCountyData(map, csvData);
}
function createDetroitMap(div){
    var map = L.map(div).setView([42.331, -83.045], 11);

    L.tileLayer(
        'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }).addTo(map);
    getDetroitData(map)
}

//get geojson data ???? THE CSV DATA IS PASSED CORRECTLY UNTIL HERE
function getCountyData(map, csvData){
  //load the data
  $.ajax("data/usCounties_Contig.json", {
    dataType: "json",
    success: function(response){
    }
  }).done(function(data){
    //setup functions that will run upon success
    var myStyle = { "color": "red", "weight": .5}
    L.geoJSON(data, {style: myStyle}).addTo(map);
    // console.log(data);
    //call csv data to join
    countyIntData = joinData(data,csvData);
    console.log(countyIntData);

  }).fail(function() { alert("There has been a problem loading the US Counties geojson")})
}
function getDetroitData(map){
  //load the data
  $.ajax("data/miTracts.json", {
    dataType: "json",
    success: function(response){
    }
  }).done(function(data){
    //setup functions that will run upon success
    var myStyle = { "color": "green", "weight": .5}
    L.geoJSON(data, {style: myStyle, onEachFeature: makePopup}).addTo(map);
    console.log(data);
  }).fail(function() { alert("There has been a problem loading the US Counties geojson")})
};

//<<<<<<< HEAD
function createPieChart(){
    var w = 300,                        //width
    h = 300,                            //height
    r = 100,                            //radius
    color = d3.scale.category20c();     //builtin range of colors


//data from csvCountiesInternet.csv - values are total for US
    data = [{"label":"Internet Access", "value":96675972}, //dial-up or broadband
            {"label":"No Internet Access", "value":10383777},
            {"label": "No Computer", "value":13875454}
           ];


    var vis = d3.select("body")
        .append("svg:svg")              //create the SVG element inside the <body>
        .data([data])                   //associate our data with the document
            .attr("width", w)           //set the width and height of our visualization (these will be attributes of the <svg> tag
            .attr("height", h)
        .append("svg:g")                //make a group to hold our pie chart
            .attr("transform", "translate(" + r + "," + r + ")")    //move the center of the pie chart from 0, 0 to radius, radius

    var arc = d3.svg.arc()              //this will create <path> elements for us using arc data
        .outerRadius(r);

    var pie = d3.layout.pie()           //this will create arc data for us given a list of values
        .value(function(d) { return d.value; });    //access the value of each element in our data array

    var arcs = vis.selectAll("g.slice")     //select all <g> elements with class slice (there aren't any yet)
        .data(pie)                          //associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties)
        .enter()                            //create <g> elements for every "extra" data element that should be associated with a selection. The result is creating a <g> for every object in the data array
            .append("svg:g")                //create a group to hold each slice (we will have a <path> and a <text>                                     element associated with each slice)
            .attr("class", "slice");    //for styling

        arcs.append("svg:path")
                .attr("fill", function(d, i) { return color(i); } ) //set the color for each slice to be chosen from the color function defined above
                .attr("d", arc);                                    //this creates the actual SVG path using the associated data (pie) with the arc drawing function

        arcs.append("svg:text")                                     //add a label to each slice
                .attr("transform", function(d) {                    //set the label's origin to the center of the arc
                //we have to make sure to set these before calling arc.centroid
                d.innerRadius = 0;
                d.outerRadius = r;
                return "translate(" + arc.centroid(d) + ")";        //this gives us a pair of coordinates like [50, 50]
            })
            .attr("text-anchor", "right")                          //center the text on its origin
            .text(function(d, i) { return data[i].label; });        //get the label from our original data array
};

//$(document).ready(loadPage)

//taken from D3 lab -
//why it's not reading csvData.length:  https://stackoverflow.com/questions/43744205/cannot-read-property-length-of-undefined-but-can-still-print-length-in-consol
function joinData(geoJson, csvData){
  csvLength = csvData.length;
  //loop through csv to assign each csv values to json
  for (var i=0; i<csvLength; i++) {
    var csvRegion = csvData[i];
    var csvKey = csvRegion.geo_id.slice(-5); //csv JOIN field
    //console.log(csvKey);
    //loop through json to match keys
    for (var a=0; a<geoJson.length; a++){
      console.log(a);
      var geojsonProps = geoJson[a].properties;//the current areas geojson properties
      var geojsonKey = geojsonProps.GEOID; //the geojson JOIN field
      //where geoid's match, attach csv to json object
      console.log(geojsonKey, csvKey);
      if (geojsonKey == csvKey) {
        attrIntArray.forEach(function(attr){
          var val = parseFloat(csvRegion[attr]); //get csv attribute value
          geojsonProps[attr] = val; //assign attribute and value to geojson props
        });
      };
    };
  };
  console.log(geoJson);
  return geoJson;
};
//$(document).ready(loadPage)
//>>>>>>> 46c4e6fc64c8b8a57ec2abbf9e0633e56c222722
