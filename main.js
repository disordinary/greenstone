var parser = require( "./parse.js" );

var evaluate = require("./eval.js");


//module.exports = function( path , locals , out ) {
module.exports = function( template , locals  ) {



    var tokens = parser.prepare_tokens( template );
    var nodes = evaluate.evaluate( parser.parse_block( tokens ) , locals );

    //console.log( parser.parse_block( tokens ) );

    //out( false , '<!doctype html>' + nodes.join( '' ) );
    //template( false , '<!doctype html>' + greenStone.parse( temp , locals , greenStone.newNode('html')).toString( ) );

}