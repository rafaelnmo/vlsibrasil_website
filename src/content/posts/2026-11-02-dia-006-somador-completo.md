---
title: "Dia 006 - Somador Completo"
description: "Dia 006 do Desafio 100 Dias de RTL: o somador completo (full adder) montado com dois meios somadores, introduzindo projeto hierárquico em Verilog, com testbench e simulação no Icarus Verilog e GTKWave."
date: 2026-11-02
author: rafael
categories: ["100 Dias de RTL", "Verilog"]
tags: ["RTL", "Verilog", "Aritmética", "Somador", "Icarus Verilog", "GTKWave"]
cover: "/assets/images/100dias/dia_006/dia_006_capa.png"
draft: true
---
Ontem vimos que o meio somador não tem uma entrada de vai-um e, por isso, não consegue somar números de vários bits. Hoje resolvemos esse problema com o **somador completo** (*full adder*), e aproveitamos para dar um passo importante em Verilog: o **projeto hierárquico**, montando um circuito a partir de outros módulos.

---

## Descrição

Quando somamos números de vários bits à mão, cada coluna recebe **três** valores: um bit de cada número e o vai-um que veio da coluna anterior:

```text
   vai-um:  1 1 1
            0 1 1 1   (7)
          + 0 0 1 1   (3)
          ---------
            1 0 1 0   (10)
```

O somador completo faz exatamente o trabalho de **uma coluna**: soma os bits `in_a` e `in_b` com o vai-um de entrada `cin` (*carry in*) e gera:

- **`sum`**: o bit de resultado daquela coluna;
- **`cout`** (*carry out*): o vai-um para a próxima coluna.

O maior resultado possível é `1 + 1 + 1 = 3`, ou `11` em binário, que cabe nos dois bits de saída. Ligando o `cout` de um somador completo no `cin` do próximo, podemos somar números de qualquer tamanho. Esse é o tema dos próximos dias do desafio.

## Diagrama de Blocos

![Diagrama de blocos do somador completo](/assets/images/100dias/dia_006/dia_006_diagrama_blocos.png)

| Sinal  | Direção | Largura | Descrição                          |
|--------|---------|---------|------------------------------------|
| `in_a` | entrada | 1 bit   | Operando A                         |
| `in_b` | entrada | 1 bit   | Operando B                         |
| `cin`  | entrada | 1 bit   | Vai-um de entrada (*carry in*)     |
| `sum`  | saída   | 1 bit   | Bit de soma                        |
| `cout` | saída   | 1 bit   | Vai-um de saída (*carry out*)      |

## Tabela Verdade

Com três entradas temos 2³ = 8 combinações. Mais uma vez, `cout` e `sum` lidos juntos formam a quantidade de entradas em `1`, em binário:

![Tabela verdade do somador completo](/assets/images/100dias/dia_006/dia_006_tabela_verdade.png)

## Mapa de Karnaugh

![Mapas de Karnaugh do somador completo](/assets/images/100dias/dia_006/dia_006_mapa_karnaugh.png)

- **`sum`**: de novo o **tabuleiro de xadrez**, a assinatura da XOR. A soma é `1` quando um número **ímpar** de entradas vale `1`, ou seja, `sum` é a XOR das três entradas.
- **`cout`**: três grupos de dois `1`s, que se sobrepõem na célula `111`. Cada grupo é um termo AND de duas variáveis. O resultado é a **função maioria**: `cout = 1` quando **pelo menos duas** das três entradas valem `1`.

## Expressões Booleanas

![Expressões booleanas do somador completo](/assets/images/100dias/dia_006/dia_006_expressao_booleana.png)

A primeira forma de `cout` sai direto do mapa de Karnaugh. A segunda é equivalente e mostra como o somador completo pode ser montado com **dois meios somadores**:

1. O primeiro meio somador soma `in_a + in_b`, gerando `in_a ⊕ in_b` e `in_a · in_b`.
2. O segundo soma o resultado anterior com `cin`, gerando `sum` e o termo `cin · (in_a ⊕ in_b)`.
3. Se **qualquer um** dos dois gerou vai-um, há vai-um na saída: uma porta OR junta os dois.

## Diagrama de Circuito

Essa é a estrutura que vamos descrever em Verilog: dois meios somadores (`ms_0` e `ms_1`) e uma porta OR, ligados pelos fios internos `sum_0`, `carry_0` e `carry_1`:

![Somador completo com dois meios somadores](/assets/images/100dias/dia_006/dia_006_diagrama_circuito.png)

Os dois vai-uns internos nunca valem `1` ao mesmo tempo (se `in_a · in_b = 1`, então `in_a ⊕ in_b = 0` e o segundo meio somador não gera vai-um), por isso a porta OR poderia até ser trocada por uma XOR.

---

## Código Verilog

O somador completo é descrito de forma **estrutural**: em vez de escrever as equações, **instanciamos** o módulo `meio_somador` do Dia 005 duas vezes e ligamos as peças com fios.

```verilog
// ============================================================================
// VLSI Brasil - Desafio 100 Dias de RTL
// Dia 006 - Somador Completo (Full Adder)
// ----------------------------------------------------------------------------
// Descrição : Soma três bits (in_a, in_b e o vai-um de entrada cin), gerando
//             a soma (sum) e o vai-um de saída (cout).
//             Implementação estrutural: dois meios somadores + uma porta OR.
//             sum  = in_a XOR in_b XOR cin
//             cout = (in_a AND in_b) OR (cin AND (in_a XOR in_b))
// ============================================================================

`timescale 1ns / 1ps

module somador_completo (
    input  wire in_a,    // operando A
    input  wire in_b,    // operando B
    input  wire cin,     // vai-um de entrada (carry in)
    output wire sum,     // soma
    output wire cout     // vai-um de saída (carry out)
);

    // Fios internos que ligam os blocos
    wire sum_0;      // soma do primeiro meio somador (A XOR B)
    wire carry_0;    // vai-um do primeiro meio somador (A AND B)
    wire carry_1;    // vai-um do segundo meio somador

    // 1º meio somador: soma A e B
    meio_somador ms_0 (
        .in_a  (in_a),
        .in_b  (in_b),
        .sum   (sum_0),
        .carry (carry_0)
    );

    // 2º meio somador: soma o resultado anterior com cin
    meio_somador ms_1 (
        .in_a  (sum_0),
        .in_b  (cin),
        .sum   (sum),
        .carry (carry_1)
    );

    // Há vai-um se qualquer um dos meios somadores gerou vai-um
    assign cout = carry_0 | carry_1;

endmodule
```

O que há de novo aqui:

- **Instanciação de módulos**: `meio_somador ms_0 (...)` cria uma cópia do meio somador chamada `ms_0`. Podemos criar quantas cópias quisermos, cada uma com um nome único.
- **Conexão por nome**: `.in_a (in_a)` liga a porta `in_a` do meio somador (antes dos parênteses) ao sinal `in_a` do somador completo (dentro dos parênteses). Esse estilo é mais seguro que a conexão por posição, pois a ordem das portas não importa e fica explícito o que está ligado em quê.
- **Fios internos**: `sum_0`, `carry_0` e `carry_1` são declarados como `wire` e conectam os blocos entre si, exatamente como no diagrama de circuito.

O arquivo `meio_somador.v` é o mesmo do Dia 005, copiado para a pasta `rtl/` deste dia. Ele também precisa ser passado ao compilador, como veremos na simulação.

> **Alternativa aritmética:** assim como no meio somador, o mesmo circuito pode ser escrito em uma linha: `assign {cout, sum} = in_a + in_b + cin;`. A versão estrutural é mais longa, mas mostra como projetos grandes são organizados: blocos pequenos, testados separadamente, combinados em blocos maiores.

## Testbench

```verilog
// ============================================================================
// VLSI Brasil - Desafio 100 Dias de RTL
// Dia 006 - Testbench do Somador Completo
// ============================================================================

`timescale 1ns / 1ps

module tb_somador_completo;

    // Sinais do testbench
    reg  in_a, in_b, cin;
    wire sum, cout;

    reg  [1:0] esperado;

    integer i;
    integer erros = 0;

    // Instância do circuito sob teste (DUT - Device Under Test)
    somador_completo dut (
        .in_a (in_a),
        .in_b (in_b),
        .cin  (cin),
        .sum  (sum),
        .cout (cout)
    );

    initial begin
        // Arquivo de formas de onda para o GTKWave
        $dumpfile("tb_somador_completo.vcd");
        $dumpvars(0, tb_somador_completo);

        // Exibe o tempo em ns
        $timeformat(-9, 0, " ns", 6);

        $display("------------------------------------------");
        $display(" tempo  | a b cin | cout sum | esperado");
        $display("------------------------------------------");

        // Percorre todas as combinações de entrada
        for (i = 0; i < 8; i = i + 1) begin
            {in_a, in_b, cin} = i[2:0];
            #10;

            // Modelo de referência: a soma aritmética dos três bits
            esperado = in_a + in_b + cin;

            $display(" %t | %b %b  %b  |  %b    %b  |    %b",
                     $time, in_a, in_b, cin, cout, sum, esperado);

            if ({cout, sum} !== esperado) begin
                $display("ERRO: a=%b b=%b cin=%b -> {cout,sum}=%b, esperado %b",
                         in_a, in_b, cin, {cout, sum}, esperado);
                erros = erros + 1;
            end
        end

        $display("------------------------------------------");
        if (erros == 0)
            $display("SUCESSO: todos os testes passaram!");
        else
            $display("FALHA: %0d erro(s) encontrado(s).", erros);

        $finish;
    end

endmodule
```

O testbench testa as 8 combinações de entrada e, como no Dia 005, usa a soma aritmética como modelo de referência: `esperado = in_a + in_b + cin;`. Repare que o testbench só enxerga as portas do `somador_completo`: para ele, não importa se o circuito foi feito com meios somadores, com portas lógicas ou com o operador `+`.

---

## Simulação

### Diagrama de tempo esperado

As entradas percorrem as 8 combinações (de `000` a `111`), uma a cada 10 ns:

![Diagrama de tempo esperado](/assets/images/100dias/dia_006/dia_006_diagrama_tempo_esperado.png)

### Rodando no Icarus Verilog

Como o projeto agora tem **dois módulos de RTL**, os dois arquivos precisam ser passados ao `iverilog`:

```bash
# compila o projeto (dois módulos) e o testbench
iverilog -g2012 -Wall -o tb_somador_completo.vvp rtl/meio_somador.v rtl/somador_completo.v rtl/tb_somador_completo.v

# executa a simulação
vvp tb_somador_completo.vvp
```

A saída no terminal:

```text
VCD info: dumpfile tb_somador_completo.vcd opened for output.
------------------------------------------
 tempo  | a b cin | cout sum | esperado
------------------------------------------
  10 ns | 0 0  0  |  0    0  |    00
  20 ns | 0 0  1  |  0    1  |    01
  30 ns | 0 1  0  |  0    1  |    01
  40 ns | 0 1  1  |  1    0  |    10
  50 ns | 1 0  0  |  0    1  |    01
  60 ns | 1 0  1  |  1    0  |    10
  70 ns | 1 1  0  |  1    0  |    10
  80 ns | 1 1  1  |  1    1  |    11
------------------------------------------
SUCESSO: todos os testes passaram!
```

### Formas de onda no GTKWave

```bash
gtkwave tb_somador_completo.vcd
```

![Resultado da simulação no GTKWave](/assets/images/100dias/dia_006/dia_006_simulacao_gtkwave.png)

Confira, por exemplo, o intervalo entre 70 e 80 ns: com as três entradas em `1`, temos `cout = 1` e `sum = 1`, ou seja, `11` em binário, que é 3.

> **Dica:** no GTKWave, expanda `tb_somador_completo` → `dut` na árvore de hierarquia (painel **SST**) para ver os sinais internos `sum_0`, `carry_0` e `carry_1` e as instâncias `ms_0` e `ms_1`. O `$dumpvars(0, ...)` grava todos os níveis da hierarquia.

---

## Resumo

- O somador completo soma três bits (`in_a`, `in_b` e `cin`) e gera `sum` e `cout`.
- `sum = in_a ⊕ in_b ⊕ cin` (paridade) e `cout` é a função maioria das três entradas.
- Pode ser montado com dois meios somadores e uma porta OR.
- Em Verilog: **projeto hierárquico** com instanciação de módulos, conexão por nome e fios internos.

Com o somador completo pronto, estamos prontos para somar números de vários bits. No **Dia 007** vamos encadear somadores completos para construir o **Carry Propagate Adder (CPA)**. Até amanhã!
