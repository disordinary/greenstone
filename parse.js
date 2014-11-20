
var BLOCK_TYPE = Object.freeze( { //enum for block type
      BASE              : 0
    , BLOCK             : 1
    , ARGUMENT          : 2
    , LOOP              : 3
    , STRING            : 4
    , FORMATTED_STRING  : 5
    , COMMENT           : 6

} );
function NODE( tag , type , arguments , children  ) {
    this.type       = "NODE"//type || BLOCK_TYPE.BLOCK;
    this.tag        = tag || "BASE";
    this.arguments  = arguments || null;
    this.children   = children || [];
  //   console.log("NEW NODE");
};
function ARGUMENTS( ) {


}
function VARIABLE( ) {
    this.type = "VARIABLE";
    this.variable = [ ];
    this.toString = function( ) {
        return "$" + this.variable.join('/');
    }
}
function STRING( ) {
    this.type = "STRING";
    this.string = [ ];


}
function prepare_tokens( template ) {
    //make content easy to parse by putting spaces around the tokens that we want, and then splitting based on space
    //because space is one of the characters we are interested in space space space = a single space.

    // match asterisk [^/]\*(?!/) (last character)
    // match slash [^\*]/(?!\*) (last character)
    // match > >= < <= * && ||  without breaking
    var tokens = template
        .replace( /([ {}\(\)"\'=;,$\n.#@]|\/\*|\*\/)/gi , ' $1 ')
        //we don't care about new lines or tabs so we simply ignore them.
        //will need to rethink this for formatted text
        .replace( new RegExp('\r|\t' , 'g' ) , '' ).split( ' ' );

    return tokens;
}


function parse_block( tokens , _arguments , type , _tag  ) {
    var children = [];
    var tag = "";
    var arguments = null;
    var thisNode = new NODE( _tag , BLOCK_TYPE.BLOCK , _arguments );
    var last_token;
    var token;
    while( tokens.length ) {
        last_token = token;
        token = tokens.shift( );
        //console.log( token );
        switch( token ) {
            case "{":
             //   console.log("OPEN");
            //    console.log("***********" + arguments);
                thisNode.children.push( parse_block(tokens , arguments , BLOCK_TYPE.BLOCK , tag ));
                break;
            case "}":
           //     console.log("CLOSE");
                return thisNode;
              // return new NODE( _tag , BLOCK_TYPE.BLOCK , arguments , children );
            case "(":
               // if( child_arguments === null ) {
                arguments = parse_argument(tokens , BLOCK_TYPE.BLOCK);
            //    console.log(arguments);
               // } else {
               //     children.push( parse_expression(tokens ));
               // }

                break;
            case "\"":
                thisNode.children.push( parse_string(tokens) );
                break;
            case '.':
                if(last_token == tag) {
                    arguments = "SFDSD";
                } else if( last_token = " " ) {
                    console.log("NEW NODE");
                }
                break;
            case '#':
                break;
            case '$':
                thisNode.children.push( parse_variable(tokens) );
                break;
            default:
                if( token !== "" ) {
                    tag = token;
                //    console.log( tag );
                    arguments = null;
               //     console.log("NULL");
                    //if this termanates with a ; then make it into a block
                    var type = lookahead( tokens , ";" , "{" );
                    if( type.result === ";" ) {
                        var argument = lookahead(tokens , ";" , ")");
                        if( argument.result === ')') {
                            tokens[type.count] = "}";
                            tokens.splice(argument.count + 1 , 0,"{")  ;
                        }   else {
                            tokens[type.count] = "}";
                            tokens.unshift( "{" );
                        }
                      //  console.log( tokens );
                    }
                }
        }

       // console.log("X");
    }
    return thisNode;

}
function parse_string ( tokens ) {
    var str = new STRING( );
    while( tokens.length ) {
        var token = tokens.shift( );
        if( token === "\"") {
            return str;
        } else if( token === "$" ) {
            str.string.push( parse_variable( tokens ) );
        } else {
            str.string.push(token);
        }
    }
    return str;
}
function parse_argument( tokens , type ) {
    var tags = [];
    var key = "";
    var value = "";

    while( tokens.length ) {
        var token = tokens.shift( );
        if( token === "," ) {
            tags.push( { key : key , value : value || true });
            key = "";
            value = "";
        } else if( token !== "=" && token !== " " && token !== "" && token !== "\"" && token !== ")" && token !== "in") {
            var val = token;
            if( token === "$" ) {
                val = ( parse_variable(tokens) );

            } else if( token === "\"") {
                val = parse_string(tokens);
            }
            if( key === "" ) {
                key = val;
            } else {

                value = val;
            }
        } else if( token === "=" || token === "!" || token === "<" || token === ">" ) {
               tags.push( { key : "OP" , value : token });

        }
        if( token === ")" ) {
          tags.push( { key : key , value : value || true });
             return tags;
        }
    }
}

function parse_expression( tokens ) {
    throw new Error("UNIMPLEMENTED");
    while( tokens.length ) {
        var token = tokens.shift( );
        if( token === ")" ) {
            return "EXPRESSION";

        }
    }
}
function parse_variable( tokens ) {
    var variable = new VARIABLE( );
    var oldToken = "";
    while( tokens.length ) {

        var token = tokens.shift( );

        if( (tokens[ 0 ] === "" &&  token === "" ) || tokens[ 0 ] === "+" || tokens[ 0 ] === "=" || tokens[ 0 ] === "-" || tokens[ 0 ] === "/" || tokens[ 0 ] === "*" || tokens[ 0 ] === "," || tokens[ 0 ] === ";" || tokens[ 0 ] ===  ")" || tokens[ 0 ] === "}"  ) {
//            if( oldToken ) {

                variable.variable.push( token || oldToken );
  //          }

            return variable;
        } else {
            if( token === "." ) {
                if( oldToken ) {
                    variable.variable.push( oldToken );
                }
            }
            if( token !== "" && token !== "." ) {
                oldToken = token;
            }
        }


    }
    variable.variable.push( token );

    return variable;
}
function lookahead( tokens , comparison ) {
    var args = [];
    if( comparison instanceof Array ) {
        args = comparison;
    } else {
        args = Array.prototype.slice.apply( arguments );
        tokens = args.shift( );
    }
    for( var ii = 0, iic = tokens.length; ii < iic; ii++ ) {
        for( var i = 0, ic = args.length; i < ic; i++ ) {

            if( tokens[ ii ] === args[ i ] ) {

                return {
                      result : args[ i ]
                    , count  : ii
                }

            }
        }
    }
}
module.exports.prepare_tokens = prepare_tokens;
module.exports.parse_block = parse_block;
module.exports.parse_argument = parse_argument;
module.exports.parse = function( template_string ) {
  var tokens = prepare_tokens( template_string );
  return parse_block( tokens );
}