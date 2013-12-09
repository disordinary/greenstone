(function() {
    var node = {
        appendChild 	: function( node ) {
            return this.children.push( node );
        }
        , setAttribute : function( name , value ) {
            this.attributes[ name ] = value;
        }
        , toString		: function( ) {
            var retStr = "<" + this.name;
            if( this.id !== "" ) {
                retStr += ' id="' + this.id + '"';
            }
            if( this.className !== "" ) {
                retStr += ' class="' + this.className + '"';
            }
            for( var attribute in this.attributes ) {
                retStr += ' ' + attribute + '="' + this.attributes[ attribute ] + '"';
            }
            if( this.children.length > 0 ) {
                retStr += '>';

                for( var i = 0, ic = this.children.length; i < ic; i++ ) {
                    if( typeof this.children[ i ] !== 'undefined' ) {
                        retStr += this.children[ i ].toString( );
                    }
                }
                retStr += '</' + this.name + '>';
            } else {
                retStr += ' />'
            }

            return retStr;
        }
    };


    var document = {
        createElement : function( name ) {
            var n = Object.create( node );
            n.className 	= "";
            n.id			= "";
            n.attributes	= { };
            n.children		= [ ];
            n.name = name;
            return n;
        }
        , createTextNode : function( text ) {
            return text;
        }
        , createComment : function( text ) {
            return '<!--' + text + '-->';
        }
    };


    module.exports = document;

})();