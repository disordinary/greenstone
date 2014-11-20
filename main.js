var fs = require( 'fs' );

var parser = require( "./parse.js" );

var evaluate = require("./eval.js");

var compile = require('./compile.js" );


//module.exports = function( path , locals , out ) {
module.exports = function( template , locals , out ) {

    var container_path =  ( fs.readFileSync( path.substr( 0 , path.lastIndexOf('/' ) ) + '/layout.gs' , 'utf8') );
    var tokens = parser.prepare_tokens( container_path );
    var container = evaluate.evaluate( parser.parse_block( tokens ) , locals );


    var body_path = ( fs.readFileSync( template , 'utf8') );
    var tokens = parser.prepare_tokens( body_path );
    var body = evaluate.evaluate( parser.parse_block( tokens ) , locals );

    //console.log( parser.parse_block( tokens ) );

    out( false , '<!doctype html>' + nodes.toString() );
    //template( false , '<!doctype html>' + greenStone.parse( temp , locals , greenStone.newNode('html')).toString( ) );


  //var nodes =parse( prepare_tokens( fs.readFileSync(   , 'utf8') ) ).children , '' , locals ).children;


};



