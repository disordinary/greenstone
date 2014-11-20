'use strict';

try {
	//if this is in node then we use FS for import, import doesn't work in the browser at the moment
	var fs = require( 'fs' );
	var __body__ = null;
} catch( e ) {
	var fs = null;
}

( function( ) {
	function clone( to_clone ) {

		to_clone = to_clone || this;
		var copy = { };
		for( var id in to_clone ) {
			var obj = to_clone[ id ];
			if( obj instanceof Object ) {
				copy[ id ] = clone( obj );
			} else if( obj instanceof Array ) {
				copy[ id ] = obj.slice( );
			} else if( obj instanceof Date ) {
				return new Date( obj.getTime( ) );
			} else {
				copy[ id ] = obj;
			}
		}
		return copy;
	}



	//var util = require('util');

	/**
	 * Dom shim for non browser environments like Node.
	 **/
	if( typeof document === 'undefined' ) {
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
		}

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
		}
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

	/**
	 * Parses an array of tokens into a basic AST tree
	 * @token_list {<array(strings)} - A string of tokens
	 * @current_block_type what the type of block is, it is either a block, a string, or an argument, however it also includes dom elements
	 * @current_block the current block that this element falls within ???
	 * @depth the numeric depth within a tree - used for debugging
	 * @one_line is this item a block item or a single line item ie p { "text" } is a block whereas p "text"; is a single line
	 **/
	function parse( token_list , current_block_type , current_block , depth , one_line ) {
		//console.log( current_block_type  );
		//block type === for, one_line
		//current block === expression, block, comment, string;
		//console.log( '1*****' + current_block_type  + '*****');


		current_block_type = current_block_type || 'block';
		//console.log( '2*****' + current_block_type  + '*****');
		var tree = {
			  type     : current_block_type
			, children : [ ]
		}

		one_line = one_line || false;
		depth = depth || 0;
		var groupState = null; //state of related statements on the same level, only used for if / else
		while( token_list.length > 0 ) {

			var token = token_list.shift( );

			switch( token ) {
				case '(':
					if( is_string_type( current_block_type)  ) {
						tree.children.push( token );
						break;
					}
					var children = parse( token_list , 'argument' , tree , depth + 1 );
					token_list = children.token_list;
					if( !tree.argument ) {
						tree.argument = [ ];
					}
					tree.argument = tree.argument.concat( format_arguments( tree.type , children.children ) );

					break;
				case ')':
					if( is_string_type( current_block_type)  ) {

						tree.children.push( token );
						break;
					}
					if( current_block_type === 'argument' ) {
						return {
							  token_list 	: token_list
							, children 		: tree.children
						}
					}
					break;
				case '{':
					if( is_string_type( current_block_type)  ) {

						tree.children.push( token );
						break;
					}
					var children = parse( token_list , 'block' , tree , depth + 1 );

					token_list = children.token_list;
					if( children.children.type ) {
						tree.children = tree.children.concat( children.children.children );
					} else {
						tree.children = tree.children.concat( children.children );
					}

					return {
						  token_list 	: token_list
						, children 		: tree
					}


					break;
				case '}':
					if( is_string_type( current_block_type )  ) {

						tree.children.push( token );
						break;
					}

					if( current_block_type === 'block' ) {

						return {
							  token_list 	: token_list
							, children 		: tree.children
						}
					}
					break;
				case '"':
					if( current_block_type !== 'formatted_string' && current_block_type !== 'comment') {
						if( current_block_type !== 'string' ) {
							var children = parse( token_list , 'string' , tree , depth + 1 );
							token_list = children.token_list;
							tree.children.push( children.children );
						} else if( current_block_type === 'string' ) {
							tree.children = tree.children.join( '' );
							return {
								  token_list 	: token_list
								, children 		: tree
							}

						}
					}
					break;
				case "'":
					if( current_block_type !== 'formatted_string' ) {
						var children = parse( token_list , 'formatted_string' , tree , depth + 1 );
						token_list = children.token_list;

						tree.children.push( children.children );
					} else if( current_block_type === 'formatted_string' ) {

						tree.children = tree.children.join( '' );
						return {
							  token_list 	: token_list
							, children 		: tree
						}

					}
					break;
				case '/*':
					var children = parse( token_list , 'comment' , tree , depth + 1 );
					token_list = children.token_list;

					children.children.children = children.children.children.join( '' )

					tree.children.push( children.children );
					break;
				case '*/':
					if( current_block_type === 'comment' ) {
						return {
							  token_list 	: token_list
							, children 		: tree
						}
					}
					break;
				case '':
					if( is_string_type( current_block_type)  ) {
						if( token_list[ 0 ] === '' ) {
							tree.children.push( ' ' );
							token_list.shift( );
						}
						if( token_list[ 0 ] === '' ) {
							token_list.shift( );
						}
					}
					break;
				case '\n':
					break;
				case ';':
					if( is_string_type( current_block_type)  ) {

						tree.children.push( token );
						break;
					}
					if( one_line ) {
						return {
							  token_list 	: token_list
							, children 		: tree
						}
					}
					break;
				case 'in':
				case ',':
					if( is_string_type( current_block_type)  ) {

						tree.children.push( token );
					}
					break;
				case '@':

					if( is_string_type( current_block_type)  ) {
						tree.children.push( token );
						break;
					}

					var name = token_list.shift( );

					var is_defined = look_ahead( token_list , /[;|{]/g ) === ';' ? false : true;


					var children = parse( token_list , 'mixin_is_definition_' + is_defined , tree , depth + 1 , !is_defined );
					token_list = children.token_list;

					tree.children.push( children.children );
					tree.children[ tree.children.length - 1 ].name = name;


					break;
				case '#':
				case '.':
					if( is_string_type( current_block_type)  ) {
						tree.children.push( token );
						break;
					}
					if( current_block_type === 'block' ) {

						var one_line = look_ahead( token_list , /[;|{]/g ) === ';' ? true : false; ///[;|{']/g think the ' is a mistake so removed
						token_list.unshift( token );
						var children = parse( token_list , 'div' , tree , depth + 1 , one_line );
						token_list = children.token_list;
						tree.children.push( children.children );

					} else {
						if( !tree.argument ) {
							tree.argument = [ ];
						}
						if( token === '#' ) {
							tree.argument.push( { type : 'property' , name : 'id' , value : token_list.shift( ) } );
						} else {
							tree.argument.push( { type : 'property' , name : 'class' , value : token_list.shift( ) } );
						}


					}



					break;
				case '$':
					//variables break strings, comments, and formatted_strings in order to place variables inline to text
//					console.log( current_block_type );
					if( is_string_type( current_block_type)  ) {
						//if its escaping
						if( token_list[ 1 ] === '$' ) {
							token_list.shift( )
//							console.log( '14' );
							tree.children.push( token_list.shift() );
							break;
						}
						//stop the current string
						current_block.children.push( { type : current_block_type , children : tree.children.join( '' ) } );
						//append a variable
						current_block.children.push( { type : 'variable' , 'name' : token_list.shift( ) } );
						//empty current string
						tree.children.length = 0;
						//continue with string processing, with a new string this time.


					//	var children = parse( token_list , current_block_type , tree , depth + 1 );
					//	token_list = children.token_list;

						//return { token_list : token_list , children : children.children };
					} else {
						tree.children.push( { type : 'variable' , 'name' : token_list.shift( ) } );
					}
					break;

				case 'include':
					var _token = null, i = 0;
					var path = "";
					while( ";" !== _token ) {
						_token = token_list[ i ];
						if( '"' !==_token && "(" !==  _token && ")" !== _token && ' ' !== _token && ';' !== _token ) {
							path += _token;
						}
						i++;
					}

					if( path === 'body' ) {
						var tokens = prepare_tokens( __body__ );
						token_list.splice( 0 , i );
						token_list = tokens.concat( token_list )
						break;
					}
					try {
						var temp = fs.readFileSync( path , 'utf8');
					} catch ( e ) {
						try {
							var temp = fs.readFileSync( path + '.gs', 'utf8');
						} catch ( e ) {
							throw new Error( "Can't find path: " + path );
						}
					}


					var tokens = prepare_tokens( temp );
					token_list.splice( 0 , i );
					token_list = tokens.concat( token_list )



					break;

				default:

						if( current_block_type !== 'argument' && !is_string_type( current_block_type)  && current_block_type !== 'variable'  ) {
							var one_line = look_ahead( token_list , /[;|{']/g ) === ';' ? true : false;
							var children = parse( token_list , token , tree , depth + 1 , one_line );
							token_list = children.token_list;
							if( children.children.type === 'if' ) {
								groupState = children.children;
                                groupState.evaluated = false;
							} else if( children.children.type === 'else' ) {
								children.children.ifGroup = groupState;
                                groupState = null;
							}
							tree.children.push( children.children );
							break;
						} else {
							tree.children.push( token );
						}
			}

		}

		function look_ahead( tokens , match ) {
			var state = [ ];
			for( var i = 0, ic = tokens.length; i < ic; i++ ) {
				var token = tokens[ i ];
				if( token === '"' || token === "'" ) {
					if( state[ state.length -1] === token && tokens[ i + 1 ] !== token ) {
						state.pop( );
					} else {
						state.push( token );
					}
				}
				if( tokens[ i ].match(match) && state.length === 0 ) {
					return token;
				}
			}
		}

		function is_string_type( type ) {
			switch( type ) {
				case 'string':
				case 'formatted_string':
				case 'comment':
					return true;
			}
			return false;
		}

		function build_expression( expression ) {
			//recursively build an expression tree.
			var expression_tree = { };
			while( expression.length ) {
				var item = expression.shift( );

			}
		}

		function format_arguments( type , argumenti ) {
			var formatted_arguments = [ ];
			switch( type ) {
				case 'for':
					if( argumenti.length === 2 && argumenti[ 0 ].type === 'variable' && argumenti[ 1 ].type === 'variable' ) {
						argumenti[ 0 ].type = 'iterator';
						return argumenti;
					}
					throw new Error( 'The for statement should have two variables, so for( $item in $array ) or simply for( $item $array)' );
				case 'if':
				case 'else':
					//todo
					return argumenti;
				case 'with':
					if( argumenti.length < 2 && argumenti[ 0 ].type === 'variable' ) {
						return argumenti;
					}
					throw new Error( 'With should only have one element AND it should be a $variable' );
				default:
					var property = { type : 'property' , name : '' , value : { } };
					for( var i = 0, ic = argumenti.length; i < ic; i++ ) {
						if( argumenti[ i ] !== '=' ) {
							if( argumenti[ i ].type === 'string' ) {
								argumenti[ i ] = argumenti[ i ].children;
							}
							if( property.name === '' ) {
								property.name = argumenti[ i ];
								if( argumenti[ i + 1 ] !== '=' ) {
									formatted_arguments.push( property );
									property = { type : 'property' , name : '' , value : { } };
								}
							} else if( argumenti[ i - 1 ] === '=' ) {
								property.value = argumenti[ i ];
								formatted_arguments.push( property );
								property = { type : 'property' , name : '' , value : { } };
							}
						}
					}
	//				formatted_arguments.push( property );
			}
		return formatted_arguments;
		}

		return {
			  token_list 	: token_list
			, children 		: tree
		}

	}
	function getObjectFromPathString( variable_path , object , local_scope ) {
		var restricted_keys = [ 'iterator' , 'isEven' , 'isFirst' , 'isLast' ];
		local_scope = local_scope || { };
		if( typeof variable_path === 'string' ) {
			variable_path = variable_path.split( '/' );
		}



		//		[^/]\*(?!/)
		//		\[[\s]*[0-9]+
		//      \[[\s]*[0-9]+[\s]*\] == match [n]

		if( typeof local_scope[ variable_path[ 0 ] ] !== 'undefined' ) {
			variable_path.splice( 1 , 0 , '__item' );
			object = local_scope;
			for( var i = 0, ic = variable_path.length; i < ic; i++ ) {
				if( restricted_keys.indexOf( variable_path[ i ] ) > -1 && i === ic - 1 ) {
					return local_scope[ variable_path[ 0 ] ][ variable_path[ i ]  ];
				} else {
					var variable = variable_path[ i ];

					if( variable.indexOf( '[' ) > 0 ) {
						variable = variable.split( '[' );
						if( !( object[ variable[ 0 ] ] instanceof Array ) ) {
							throw new Error( "Trying to access index of variable: " + variable[ 0 ] + ", this is not an array." );
						} else {
							var offset = parseInt( variable[ 1 ].substring( 0 , variable[ 1 ].length - 1 ) );
							if( offset < 0 ) {
								offset = object[ variable[ 0 ] ].length + offset;
							}
							object = object[ variable[ 0 ] ][ offset ];
						}
					} else {
						object = object[ variable ];
					}
				}
			}
		} else {
			for( var i = 0, ic = variable_path.length; i < ic; i++ ) {
				var variable = variable_path[ i ];
				if( variable.indexOf( '[' ) > 0 ) {
					variable = variable.split( '[' );

					if( !( object[ variable[ 0 ] ] instanceof Array ) ) {
						throw new Error( "Trying to access index of variable: " + variable[ 0 ] + ", this is not an array." );
					} else {
						var offset = parseInt( variable[ 1 ].substring( 0 , variable[ 1 ].length - 1 ) );
						if( offset < 0 ) {
							offset = object[ variable[ 0 ] ].length + offset;

						}
						object = object[ variable[ 0 ] ][ offset ];
					}
				} else {
					object = object[ variable ];
				}
			}
		}
		if( typeof object.name !== 'undefined' ) {
			return object.name;
		}

		return object;
	}

	var __mixins__ = { };

	function evaluate( tree , depth , global_scope , local_scope , parent_node ) {


		global_scope = global_scope || { };
		local_scope  = clone.call( local_scope || { } );

		depth = depth || '';

		switch( tree.type ) {
			case 'string':
				return document.createTextNode( tree.children );
				break;
			case 'comment':
				return document.createComment( tree.children );
				break;
			case 'property':

				if( tree.name.type  ) {
					tree.name = evaluate( tree.name  , depth + 1, global_scope , local_scope , parent_node );
				}

				if( tree.value && tree.value.type ) {
					tree.value = evaluate( tree.value , depth + 1, global_scope , local_scope , parent_node  );
				} else if ( !tree.value || tree.value === '' || ( !tree.value.type && typeof tree.value !== 'string' ) ) {
					tree.value = "true";
				}
				return tree;
				break;
			case 'variable':


				return getObjectFromPathString( tree.name , global_scope , local_scope )
			case 'if':
                tree.evaluated = false
				if( evaluateBoolean( tree.argument , global_scope , local_scope ) ) {
					tree.evaluated = true;
					iterate_children( tree , global_scope, depth , local_scope , parent_node );
				}
				break;
			case 'else':

				if( !tree.ifGroup.evaluated || typeof tree.ifGroup.evaluated == "undefined" ) {
                    console.log("******** else **********");
					if( tree.argument ) {
						if( evaluateBoolean( tree.argument , global_scope , local_scope ) ) {

							iterate_children( tree , global_scope, depth , local_scope , parent_node );
                            tree.ifGroup.evaluated = true;
						}
					} else {

						iterate_children( tree , global_scope, depth , local_scope , parent_node );
                        //tree.ifGroup.evaluated = true;
					}
				}

				break;
			case 'for':
				var item =  tree.argument[ 0 ].name;
				var items = getObjectFromPathString( tree.argument[ 1 ].name , global_scope , local_scope );

				for( var i = 0, ic = items.length; i < ic; i++ ) {
                    local_scope[ item ] = { };
                    local_scope[ item ].__item 		= items[ i ];
					//properties on the iterator that are accesable via templates
                    local_scope[ item ].iterator 	= i + 1;
                    local_scope[ item ].isEven 		= ( i & 1 ) === 1 ? true : false;
                    local_scope[ item ].isFirst 	= ( i === 0 );
                    local_scope[ item ].isLast 		= ( i === ic - 1 );
					iterate_children( tree , global_scope, depth , local_scope , parent_node );
				}
				//console.log(getObjectFromPathString( tree.argument[ 1 ].name , global_scope , local_scope ) );
				break;
			case 'with':

				var items = getObjectFromPathString( tree.argument[ 0 ].name , global_scope , local_scope )
				for( item in items ) {
					local_scope[ item ] = { __item : items[ item ] };
				}
				//local_scope[ item ]
				//var items = getObjectFromPathString( tree.argument[  ].name , global_scope , local_scope );
				iterate_children( tree , global_scope, depth , local_scope , parent_node );
				break;

			case 'mixin_is_definition_true':

				__mixins__[ tree.name ] = tree;
				break;
			case 'mixin_is_definition_false':
			//	console.log( tree );

				var mixin = __mixins__[ tree.name ];
				for( var i = 0, ic = mixin.argument.length; i < ic; i++ ) {
					if( mixin.argument[ i ].name.type === 'variable' ) {

						local_scope[ mixin.argument[ i ].name.name ] = { __item : evaluate( tree.argument[ i ] , depth + ':' , global_scope , local_scope , parent_node ) };

					}
				}



				iterate_children( mixin , global_scope, depth , local_scope , parent_node );


				break;
			default:



				var node = document.createElement( tree.type );
				if( tree.argument ) {
					for( var i = 0, ic = tree.argument.length; i < ic; i++ ) {
						var attribute = evaluate( tree.argument[ i ] , depth + ':' , global_scope , local_scope , node );
						node.setAttribute( attribute.name , attribute.value );
					}
				}
				if( tree.children && tree.children.length > 0 ) {
						for( var i = 0, ic = tree.children.length; i < ic; i++ ) {
							node.appendChild( evaluate( tree.children[ i ], depth + ':' , global_scope , local_scope , node ) );
						}
				}
				return node;

		}


		function iterate_children( tree , content , depth , local_scope , parent_dom_node ) {


			for( var i = 0; i < tree.children.length; i++ ) {

				parent_node.appendChild( evaluate( tree.children[ i ] , depth + ':'  , content , local_scope , parent_dom_node ) );

			}
		}

	}



	if( typeof module !== 'undefined' && module.exports ) {
		module.exports = function( path , locals , template ) {

			//var fs 	= require('fs');

			__body__ = ( fs.readFileSync( path , 'utf8') );

			var nodes = evaluate( parse( prepare_tokens( fs.readFileSync( path.substr( 0 , path.lastIndexOf('/' ) ) + '/layout.gs'  , 'utf8') ) ).children , '' , locals ).children;

			//console.log( parse( prepare_tokens( fs.readFileSync( path.substr( 0 , path.lastIndexOf('/' ) ) + '/layout.gs'  , 'utf8') ) ));

			template( false , '<!doctype html>' + nodes.join( '' ) );
			//template( false , '<!doctype html>' + greenStone.parse( temp , locals , greenStone.newNode('html')).toString( ) );

		}
	} else {
		VODKA.View.template = evaluate;
		VODKA.View.create = function VODKA_View$create( template ) {
			return new TemplateItem( parse( prepare_tokens( template ) ) );
		}
	}
	function TemplateItem( AST ) {
		this.__AST__ = AST;
		this.__data__ = null;
		this.new = function( object ) {
			var temp_object = Object.create( this );
			temp_object.__data__ = object;
			temp_object.dom_nodes = evaluate( __AST__ , '' , object );
		}
		this.__update__ = function( pointer ) {

		}
	}

	function evaluateBoolean( expression , global_scope , local_scope ) {
		//rough 'n' nasty
		for( var i = 0, ic = expression.length; i < ic; i++ ) {

			if( expression[ i ].type === 'variable' ) {
				try {
					expression[ i ] = '"' + getObjectFromPathString( expression[ i ].name , global_scope , local_scope ) + '"';
				} catch( e ) {
					return false;
				}

			} else if( expression[ i ].type === 'string' ) {
				expression[ i ] = '"' + expression[ i ].children + '"';
			}
		}

		//need to sanitize this can only have strings, numbers and operators

		return eval( expression.join( '' ) ) ;
	}


} ) ( );





