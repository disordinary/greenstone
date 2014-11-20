var document = require( "./dirtyDom.js" );
var methods = { };

module.exports.addFN = function( name , fn ) {
    methods[ name ] = fn;
}

function SCOPE( global , local ) {
    this.global = global || { };
    this.local = local || { };

    this.get = function scope$get( variable ) {
        if( this.local.hasOwnProperty(variable) ) {
            if( typeof this.local[ variable ] === "object" ) {
                return new SCOPE( this.global , this.local[ variable ] );
            } else {
                return this.local[ variable ];
            }
        } else if( this.global.hasOwnProperty(variable) ) {
            if( typeof this.global[ variable ] === "object" ) {
                return new SCOPE( this.global[ variable ] , this.local );
            } else {
                return this.global[ variable ];
            }
        }
    }
    return null;
}

module.exports.evaluate = function( template , variables ) {
    var base = document.createElement("BASE");
   // console.log( template );
    evaluate( base , template.children , new SCOPE( variables ) );
    //console.log( base.toString());
    return base;
}
function evaluate( parent_node , nodes , scope ) {

    for( var i = 0, ic = nodes.length; i < ic; i++ ) {
        var node = nodes[i];
        if( node.type === "NODE" ) {
            var tag = node.tag.toUpperCase();
            if( tag === "FOR" ) {
                var iterator = eval_var( node.aguments[0].value , scope );
                var i = 0;
                var length = iterator.length || Object.keys( iterator ).length;
                for(var item in iterator) {
                    var _scope = new SCOPE( Object.create( scope.global ) , Object.create( scope.local ) )
                    _scope.local[ node.arguments[0].key.variable[0] ] = item;
                    _scope.local._iterator = i++;
                    _scope.local._even = i & 1;
                    _scope.local._first = ( i === 1 );
                    _scope.local._last = (i === length );
                    evaluate( parent_node , nodes , scope )
                }

            } else if( tag === "IF" ) {

            } else if( tag === "ELSEIF" ) {

            } else if( tag === "ELSE" ) {

            } else {
                var dom_node = document.createElement( node.tag );
                parent_node.appendChild( dom_node );
                if( node.children && node.children.length ) {
                    evaluate( dom_node , node.children , scope );
                }
            }
        } else if( node.type === "STRING" ) {
            parent_node.appendChild( document.createTextNode( eval_string( node , scope ) ) );
        } else if( node.type === "VARIABLE" ) {
            parent_node.appendChild( document.createTextNode( eval_var( node , scope ) ) );
        }

    }
}
function eval_string( node , scope ) {
    var retString = "";
    for( var i = 0, ic = node.string.length; i < ic; i++ ) {
        if( node[i] && node[i].type && node[i].type === "VARIABLE" ) {
            retString += eval_var(node[i] , scope );
        }
        retString += node.string[ i ];
    }

    return retString;

}
function eval_var( node , scope ) {
    var self = scope;

    for( var i = 0, ic = node.variable.length; i < ic; i++ ) {

        if( typeof self === "object"  ) {
            self = self.get( node.variable[ i ] );
        } else {
           return self;
        }
    }
 //   console.log( self );
    return self;
}


