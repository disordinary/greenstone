var chai = require('chai');
var util = require('util');
/*  , foo = 'bar'
  , beverages = { tea: [ 'rooibos', 'matcha', 'oolong' ] };

var expect = chai.expect;
expect(foo).to.be.a('string').and.equal('barx');
expect(beverages).to.have.property('tea').with.length(3);

var should = chai.should();
foo.should.be.a('string').and.equal('bar');
beverages.should.have.property('tea').with.length(3);

*/

console.log("PARSING");
var parser = require('../parse.js');

var template =
'html  {\
  head {\
    title "title";\
  }\
  body {\
    div.classOne.classTwo {\
      p "content";\
    }\
    ul {\
      for( $item in $object ) {\
        if( $item/name = "one" ) {\
          li $item/name"one";\
        } elseif( $item/name = "two" ) {\
          li $item/name"two";\
        } else {\
          li $item/name;\
        }\
      }\
    }\
  }\
}\
';


var tokens = parser.prepare_tokens( template );

var adt = parser.parse_block( tokens );

console.log( util.inspect( adt , { showHidden: true , depth:null }) );


