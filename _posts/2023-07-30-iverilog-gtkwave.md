---
layout: post
title:  "Simulação com Icarus Verilog e GTKWave"
author: rafael
categories: [ RTL, simulacao, OpenFlow, iverilog ]
image: assets/images/005_post/cover/005_blog.png
---
The first mass-produced book to deviate from a rectilinear format, at least in the United States, is thought to be this 1863 edition of Red Riding Hood, cut into the shape of the protagonist herself with the troublesome wolf curled at her feet. Produced by the Boston-based publisher Louis Prang, this is the first in their “Doll Series”, a set of five “die-cut” books, known also as shape books — the other titles being Robinson Crusoe, Goody Two-Shoes (also written by Red Riding Hood author Lydia Very), Cinderella, and King Winter. 

```{verilog}
module decoder (i_decoder,o_decoder);

input [2:0] i_decoder;
output [7:0] o_decoder;
wire [7:0] out;

assign o_decoder  =  	(i_decoder == 3'b000 ) ? 8'b0000_0001 : 
		(i_decoder == 3'b001 ) ? 8'b0000_0010 : 
		(i_decoder == 3'b010 ) ? 8'b0000_0100 : 
		(i_decoder == 3'b011 ) ? 8'b0000_1000 : 
		(i_decoder == 3'b100 ) ? 8'b0001_0000 : 
		(i_decoder == 3'b101 ) ? 8'b0010_0000 : 
		(i_decoder == 3'b110 ) ? 8'b0100_0000 : 
		(i_decoder == 3'b111 ) ? 8'b1000_0000 : 8'h00;
  	  	 
endmodule
```

As for this particular rendition of Charles Perrault’s classic tale, the text and design is by Lydia Very (1823-1901), sister of Transcendentalist poet Jones Very. The gruesome ending of the original — which sees Little Red Riding Hood being gobbled up as well as her grandmother — is avoided here, the gore giving way to the less bloody aims of the morality tale, and the lesson that one should not disobey one’s mother.

> It would seem the claim could also extend to die cut books in general, as we can’t find anything sooner, but do let us know in the comments if you have further light to shed on this! Such books are, of course, still popular in children’s publishing today, though the die cutting is not now limited to mere outlines, as evidenced in a beautiful 2014 version of the same Little Red Riding Hood story. 


An 1868 Prang catalogue would later claim that such “books in the shape of a regular paper Doll… originated with us”. 

The die cut has also been employed in the non-juvenile sphere as well, a recent example being Jonathan Safran Foer’s ambitious Tree of Codes. 

