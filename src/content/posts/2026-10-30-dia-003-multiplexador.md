---
title: "Dia 003 - Multiplexador"
description: "Dia 003 do 100 Dias de RTL: o multiplexador 4x1 parametrizável, do mapa de Karnaugh à árvore de muxes, com always @(*), case, testes dirigidos e aleatórios no Icarus Verilog e GTKWave."
date: 2026-10-30
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Multiplexador", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_003/dia_003_capa.png"
draft: true
---
Nos dois primeiros dias vimos as portas lógicas isoladas. Hoje vamos combiná-las para construir um dos blocos mais usados em todo projeto digital: o **multiplexador**, ou simplesmente **mux**.

---

## Descrição

O multiplexador é uma **chave seletora digital**: ele tem várias entradas de dados, uma saída e um sinal de **seleção** (`sel`) que escolhe qual entrada é copiada para a saída.

Um mux com **N** entradas precisa de **log₂(N)** bits de seleção. O nosso mux **4x1** (4 entradas, 1 saída) usa então 2 bits de seleção:

- `sel = 00` → `out = in_0`
- `sel = 01` → `out = in_1`
- `sel = 10` → `out = in_2`
- `sel = 11` → `out = in_3`

Os multiplexadores aparecem em todo lugar: escolhendo o operando de uma ULA, selecionando qual registrador é lido em um banco de registradores, montando *shifters* e *rotators* e até implementando qualquer função lógica (um mux de 2ⁿ entradas com a tabela verdade nas entradas de dados é uma *look-up table*, a base dos FPGAs).

Para deixar o exemplo mais realista, cada entrada do nosso mux é um **barramento de 4 bits**, e essa largura é **parametrizável**.

## Diagrama de Blocos

![Diagrama de blocos do multiplexador 4x1](/assets/images/100dias/dia_003/dia_003_diagrama_blocos.png)

O traço inclinado com um número em cima de um fio indica um **barramento**, com a quantidade de bits.

| Sinal  | Direção | Largura | Descrição                       |
|--------|---------|---------|---------------------------------|
| `in_0` | entrada | 4 bits  | Entrada de dados 0              |
| `in_1` | entrada | 4 bits  | Entrada de dados 1              |
| `in_2` | entrada | 4 bits  | Entrada de dados 2              |
| `in_3` | entrada | 4 bits  | Entrada de dados 3              |
| `sel`  | entrada | 2 bits  | Seleção da entrada              |
| `out`  | saída   | 4 bits  | Cópia da entrada selecionada    |

## Tabela Verdade

Com 4 entradas de 4 bits e 2 bits de seleção, a tabela verdade completa teria 2¹⁸ = 262.144 linhas! Por isso, para multiplexadores usamos uma **tabela verdade compacta**, em que a saída é escrita em função das entradas:

![Tabela verdade do multiplexador 4x1](/assets/images/100dias/dia_003/dia_003_tabela_verdade.png)

## Mapa de Karnaugh

Para entender a lógica por dentro, vale começar pelo mux mais simples, o **2x1** (entradas `in_0` e `in_1` de 1 bit e um bit de seleção `sel`). Com 3 variáveis, o mapa de Karnaugh fica assim:

![Mapa de Karnaugh do mux 2x1](/assets/images/100dias/dia_003/dia_003_mapa_karnaugh.png)

- O grupo **azul** (linha `sel = 0`, colunas onde `in_0 = 1`) vira o termo `sel'·in_0`.
- O grupo **verde** (linha `sel = 1`, colunas onde `in_1 = 1`) vira o termo `sel·in_1`.

## Expressões Booleanas

Do mapa de Karnaugh sai a expressão do mux 2x1. O mux 4x1 segue a mesma ideia: cada entrada é "liberada" por um termo AND que só vale `1` para a sua combinação de `sel`:

![Expressões booleanas do multiplexador](/assets/images/100dias/dia_003/dia_003_expressao_booleana.png)

## Diagrama de Circuito

### Mux 2x1 com portas lógicas

A expressão do mux 2x1 vira diretamente um circuito com um inversor, duas portas AND e uma OR. Quando `sel = 0`, a AND de cima deixa `in_0` passar e a de baixo fica em `0`; quando `sel = 1`, acontece o contrário:

![Mux 2x1 com portas lógicas](/assets/images/100dias/dia_003/dia_003_mux_2x1_portas.png)

### Mux 4x1 como árvore de muxes 2x1

Muxes maiores podem ser montados com muxes menores. Um mux 4x1 é uma **árvore** de três muxes 2x1: o primeiro nível escolhe com `sel[0]` dentro de cada par, e o segundo nível escolhe o par com `sel[1]`:

![Mux 4x1 como árvore de muxes 2x1](/assets/images/100dias/dia_003/dia_003_mux_4x1_arvore.png)

---

## Código Verilog

Desta vez descrevemos o circuito com um bloco `always` combinacional e uma estrutura `case`, que deixa o código muito parecido com a tabela verdade:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 003 - Multiplexador 4x1
// ----------------------------------------------------------------------------
// Descrição : Seleciona uma de quatro entradas de WIDTH bits e a envia para
//             a saída, de acordo com o sinal de seleção sel.
//             sel = 00 -> in_0 | 01 -> in_1 | 10 -> in_2 | 11 -> in_3
// ============================================================================

`timescale 1ns / 1ps

module mux_4x1 #(
    parameter WIDTH = 4                 // largura dos dados
) (
    input  wire [WIDTH-1:0] in_0,       // entrada 0
    input  wire [WIDTH-1:0] in_1,       // entrada 1
    input  wire [WIDTH-1:0] in_2,       // entrada 2
    input  wire [WIDTH-1:0] in_3,       // entrada 3
    input  wire [1:0]       sel,        // seleção
    output reg  [WIDTH-1:0] out         // saída
);

    // Lógica combinacional: o bloco é reavaliado sempre que
    // qualquer sinal lido dentro dele mudar (@(*))
    always @(*) begin
        case (sel)
            2'b00:   out = in_0;
            2'b01:   out = in_1;
            2'b10:   out = in_2;
            default: out = in_3;        // 2'b11
        endcase
    end

endmodule
```

O que há de novo aqui:

- **`parameter WIDTH = 4`**: um parâmetro é uma constante que pode ser alterada em cada instância. O mesmo código serve para um mux de 1, 8 ou 32 bits: `mux_4x1 #(.WIDTH(8)) u_mux (...)`.
- **`output reg`**: sinais atribuídos dentro de um `always` precisam ser declarados como `reg`. Apesar do nome, isso **não** cria um registrador. É só uma regra da linguagem; o circuito continua combinacional.
- **`always @(*)`**: o `*` monta automaticamente a **lista de sensibilidade** com todos os sinais lidos dentro do bloco. Sempre use `@(*)` em lógica combinacional, pois esquecer um sinal na lista causa diferenças entre simulação e síntese.
- **`default`**: em lógica combinacional, a saída precisa receber um valor em **todos** os caminhos possíveis. Se algum caso ficar de fora, a ferramenta de síntese entende que a saída deve "lembrar" o valor anterior e infere um **latch**, que quase nunca é o que queremos. O `default` garante que isso não aconteça.

> **Alternativa:** o mesmo mux pode ser escrito com o operador ternário (`? :`) em uma atribuição contínua:
> `assign out = sel[1] ? (sel[0] ? in_3 : in_2) : (sel[0] ? in_1 : in_0);`
> Repare que essa forma é exatamente a árvore de muxes 2x1 mostrada acima.

## Testbench

Com 18 bits de entrada, testar todas as 262.144 combinações ainda seria possível, mas não ajudaria a visualizar nada. O testbench usa duas estratégias complementares:

```verilog
// ============================================================================
// VLSI Brasil - 100 Dias de RTL
// Dia 003 - Testbench do Multiplexador 4x1
// ============================================================================

`timescale 1ns / 1ps

module tb_mux_4x1;

    localparam WIDTH = 4;

    // Sinais do testbench
    reg  [WIDTH-1:0] in_0, in_1, in_2, in_3;
    reg  [1:0]       sel;
    wire [WIDTH-1:0] out;

    reg  [WIDTH-1:0] esperado;

    integer i, j;
    integer erros = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    mux_4x1 #(.WIDTH(WIDTH)) dut (
        .in_0 (in_0),
        .in_1 (in_1),
        .in_2 (in_2),
        .in_3 (in_3),
        .sel  (sel),
        .out  (out)
    );

    // Modelo de referência: desloca o vetor {in_3, in_2, in_1, in_0}
    // e pega os WIDTH bits menos significativos
    task verifica;
        begin
            esperado = {in_3, in_2, in_1, in_0} >> (sel * WIDTH);
            if (out !== esperado) begin
                $display("ERRO: sel=%0d in={%h,%h,%h,%h} -> out=%h, esperado %h",
                         sel, in_3, in_2, in_1, in_0, out, esperado);
                erros = erros + 1;
            end
        end
    endtask

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_mux_4x1.vcd");
        $dumpvars(0, tb_mux_4x1);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("-------------------------------------------");
        $display(" tempo  | in_0 in_1 in_2 in_3 | sel | out");
        $display("-------------------------------------------");

        // Parte 1: testes dirigidos (aparecem nas formas de onda)
        // Para cada conjunto de dados, percorre todos os valores de sel
        for (i = 0; i < 3; i = i + 1) begin
            case (i)
                0: {in_0, in_1, in_2, in_3} = {4'hA, 4'h5, 4'h3, 4'hC};
                1: {in_0, in_1, in_2, in_3} = {4'h1, 4'h2, 4'h4, 4'h8};
                2: {in_0, in_1, in_2, in_3} = {4'hF, 4'h0, 4'h7, 4'h9};
            endcase
            for (j = 0; j < 4; j = j + 1) begin
                sel = j[1:0];
                #10;
                $display(" %t |  %h    %h    %h    %h  |  %0d  |  %h",
                         $time, in_0, in_1, in_2, in_3, sel, out);
                verifica;
            end
        end

        // Parte 2: 1000 testes aleatórios (fora das formas de onda)
        $dumpoff;
        for (i = 0; i < 1000; i = i + 1) begin
            {in_0, in_1, in_2, in_3, sel} = $random;
            #10;
            verifica;
        end

        $display("-------------------------------------------");
        if (erros == 0)
            $display("SUCESSO: todos os testes passaram!");
        else
            $display("FALHA: %0d erro(s) encontrado(s).", erros);

        $finish;
    end

endmodule
```

- **Parte 1, testes dirigidos:** três conjuntos de dados fixos e, para cada um, todos os valores de `sel`. É essa parte que aparece nas formas de onda.
- **Parte 2, testes aleatórios:** 1000 vetores gerados com `$random`. A atribuição `{in_0, in_1, in_2, in_3, sel} = $random;` espalha os 32 bits aleatórios por todas as entradas (os bits que sobram são descartados).
- **`$dumpoff`** pausa a gravação do arquivo VCD, para que os testes aleatórios não "poluam" as formas de onda.
- **`task verifica`**: uma *task* agrupa um trecho de código reutilizável, como uma função sem retorno. Ela é chamada nas duas partes.
- **Modelo de referência:** `{in_3, in_2, in_1, in_0} >> (sel * WIDTH)` desloca o vetor com as quatro entradas até a entrada escolhida ficar nos bits menos significativos. É um jeito diferente do `case` do DUT de chegar ao mesmo resultado, que é exatamente o que queremos de um modelo de referência.

---

## Simulação

### Diagrama de tempo esperado

Os dados ficam parados enquanto `sel` percorre `0, 1, 2, 3`. A saída deve copiar, a cada 10 ns, a entrada selecionada:

![Diagrama de tempo esperado](/assets/images/100dias/dia_003/dia_003_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

```bash
# compila o projeto e o testbench
iverilog -g2012 -Wall -o tb_mux_4x1.vvp rtl/mux_4x1.v rtl/tb_mux_4x1.v

# executa a simulação
vvp tb_mux_4x1.vvp
```

A saída no terminal (só os testes dirigidos são impressos; os 1000 aleatórios são verificados em silêncio):

```text
VCD info: dumpfile tb_mux_4x1.vcd opened for output.
-------------------------------------------
 tempo  | in_0 in_1 in_2 in_3 | sel | out
-------------------------------------------
  10 ns |  a    5    3    c  |  0  |  a
  20 ns |  a    5    3    c  |  1  |  5
  30 ns |  a    5    3    c  |  2  |  3
  40 ns |  a    5    3    c  |  3  |  c
  50 ns |  1    2    4    8  |  0  |  1
  60 ns |  1    2    4    8  |  1  |  2
  70 ns |  1    2    4    8  |  2  |  4
  80 ns |  1    2    4    8  |  3  |  8
  90 ns |  f    0    7    9  |  0  |  f
 100 ns |  f    0    7    9  |  1  |  0
 110 ns |  f    0    7    9  |  2  |  7
 120 ns |  f    0    7    9  |  3  |  9
-------------------------------------------
SUCESSO: todos os testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_mux_4x1.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_003/dia_003_simulacao_gtkwave.png)

Os barramentos aparecem em hexadecimal e `out` acompanha a entrada selecionada, exatamente como no diagrama esperado.

> **Observação:** ao abrir o VCD inteiro, você vai ver os sinais em `x` (vermelho) a partir de 120 ns. É o efeito do `$dumpoff`: o Icarus marca os sinais como desconhecidos no arquivo enquanto a gravação está pausada. A imagem acima mostra só o trecho de 0 a 120 ns.

---

## Resumo

- O multiplexador seleciona uma entrada entre várias usando `sel`; N entradas precisam de log₂(N) bits de seleção.
- Mux 2x1: `out = sel'·in_0 + sel·in_1`. Muxes maiores podem ser montados em árvore.
- Em Verilog: `always @(*)` + `case`, com `default` para evitar latches, e `parameter` para deixar o bloco reutilizável.
- O testbench combina testes dirigidos (para visualizar) e aleatórios (para cobrir mais casos), usando `$dumpoff` para manter as formas de onda limpas.

No **Dia 004** vamos fazer o caminho inverso: o **demultiplexador**, que pega uma entrada e a envia para uma de várias saídas. Até amanhã!
