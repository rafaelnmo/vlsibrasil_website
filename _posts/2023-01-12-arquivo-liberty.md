---
title:  "Arquivo Liberty"
description: 
author: rafael
date: 2024-01-01 11:33:00 +0800
categories: [ Arquivos, Liberty]
tags: [Frontend, STA]
pin: true
math: true
mermaid: true
image: assets/images/001_post/cover/001_blog.png
---

O arquivo Liberty Timing (Lib) contém informações detalhadas sobre a temporização e o consumo de energia das células lógicas (std cells) de uma biblioteca de células para um determinado nó tecnológico. Essencialmente, o Liberty é um modelo de temporização que inclui dados como o atraso das células, o tempo de transição, os tempos de setup e hold, _leakage power_, entre outros.
Esse arquivo, geralmente com a extensão .lib, é um padrão desenvolvido pela Synopsys e distribuído como código aberto. Ele é amplamente utilizado no projetos de circuitos por descrever características das células, que são fundamentais para a análise de timing em várias etapas do fluxo de projetos.

## Tipos de arquivos Liberty 

Os parâmetros de temporização e consumo de potência de uma célula lógica são obtidos por meio de simulações elétricas realizadas em diferentes condições de operação — como variações de processo, temperatura e tensão. Os resultados dessas simulações são organizados e armazenados nos chamados arquivos Liberty (.lib), que são utilizados por ferramentas de EDA para análise de temporização (STA) e consumo. Existem três modelos principais utilizados para caracterizar células e gerar esses arquivos .lib:

- _**NLDM (Non-Linear Delay Model)**_
- _**CCS (Composite Current Source)**_
- _**ECSM (Effective Current Source Model)**_

### NLDM (Non-Linear Delay Model)

É o modelo mais tradicional e amplamente utilizado. Nele, a célula é modelada com base em tabelas que relacionam o atraso de propagação e a transição de saída com dois parâmetros principais:
- _**Transição na entrada (input net transition)**_
- _**Capacitância de carga na saída (Cload)**_

As simulações são feitas com fontes de tensão e os resultados são armazenados em tabelas 2D no arquivo .lib. O modelo NLDM é mais simples e leve, o que garante execução rápida das ferramentas de STA e arquivos menores. No entanto, ele apresenta limitações de precisão, especialmente em designs de alta performance, onde efeitos secundários têm maior impacto.

### CCS (Composite Current Source)
É um modelo mais avançado, desenvolvido pela Synopsys, no qual a célula é caracterizada usando uma fonte de corrente para modelar com maior fidelidade o comportamento elétrico, incluindo efeitos como queda de tensão (IR drop), acoplamento e variações de forma de onda.
O arquivo gerado, chamado CCS Lib, oferece maior precisão na análise de temporização e integridade de sinal, sendo ideal para tecnologias mais avançadas (por exemplo, abaixo de 28 nm). Por outro lado, o CCS requer mais parâmetros de entrada, tem maior tempo de simulação e gera arquivos .lib maiores.

### ECSM (Effective Current Source Model)
O ECSM é uma alternativa ao CCS, também baseado em uma fonte de corrente, mas com um modelo mais compacto e eficiente. Ele tenta equilibrar precisão e desempenho, oferecendo resultados comparáveis ao CCS, mas com menor complexidade computacional e arquivos menores.
O ECSM é amplamente adotado por ferramentas da Cadence e se destaca pela boa precisão na modelagem da forma de onda de saída e transições internas, sem penalizar tanto a performance da análise.
Cada modelo tem seus prós e contras, e a escolha entre NLDM, CCS e ECSM depende dos requisitos de precisão, tempo de execução e tecnologia do processo utilizados no projeto. A [Figura 1](#fig-libsize) mostra uma comparação do tamanho de um arquivo CCS e um NLDM.


<figure id="fig-libsize">
  <div  class="image-wrapper-clear">
    <img src="/assets/images/001_post/lib_size.png" class="responsive-img" alt="Comparação do tamanho de arquivos Liberty CCS e NLDM">
  </div>
  <figcaption>Figura 1: Comparação do tamanho de arquivos <em>Liberty</em> CCS e NLDM.</figcaption>
</figure>


## Contexto no VLSI

No processo de design de circuitos integrados, especialmente nas etapas de síntese lógica e análise estática de temporização (STA), é fundamental dispor de informações precisas sobre os atrasos e consumo das células que compõem o circuito, como portas lógicas e flip-flops. Fazer simulações SPICE para o circuito completo seria muito complexo e demorado. Por isso, utiliza-se modelos simplificados de temporização, chamados timing models, que permitem estimar atrasos de forma eficiente.

Para cada _cell arc_, isto é, cada caminho específico entre uma entrada e uma saída de uma célula lógica, conforme ilustrado na [Figura 2](#fig-cellarc) , são determinados dois parâmetros principais: o atraso de propagação (_propagation delay_, tpd) e a transição de saída (_output transition time_, trise/tfall). O _propagation delay_ representa o tempo que leva para uma mudança na entrada refletir na saída. Já a _output transition time_ indica quanto tempo a saída leva para estabilizar após essa mudança.

<figure id="fig-cellarc">
  <div class="image-wrapper-clear" >
    <img src="/assets/images/001_post/cell_arc.png" class="responsive-img"  alt="Exemplos de diferentes cell arcs para uma standard cell">
  </div>
  <figcaption>Figura 2: Exemplos de diferentes <em>cell arcs</em> para uma standard cell.</figcaption>
</figure>

Os modelos NLDM (_Non-Linear Delay Models_) são amplamente utilizados para essa finalidade. Eles consideram dois fatores principais como entrada: a transição de entrada (_input net transition_, trise/tfall) e a capacitância de carga na saída (_output load capacitance_, cload). Com base nesses dois parâmetros, que são tabulados no arquivo .lib, as ferramentas de EDA utilizadas para STA conseguem calcular tanto o atraso de propagação quanto a transição de saída, conforme ilustrado na [Figura 3](#fig-timingcalc) abaixo.

<figure id="fig-timingcalc">
  <div class="image-wrapper-clear">
    <img src="/assets/images/001_post/timing_calculation.png" class="responsive-img" alt="Parâmetros utilizados e calculados usando NLDM">
  </div>
  <figcaption>Figura 3: Parâmetros utilizados e calculados usando <em>NLDM</em>.</figcaption>
</figure>


Esses dados presentes no arquivo Liberty são fornecidos pela _foundry_, que os obtém por meio de simulações detalhadas durante o processo de caracterização elétrica das células padrão (_standard cells_). É importante destacar que cada arquivo _Liberty_ é gerado considerando diferentes condições de operação — como variações de processo, temperatura e tensão (chamadas de corners). Assim, os valores de atraso de propagação e transição de saída dependerão diretamente do corner utilizado durante a análise de temporização.

O Liberty é construído por declarações (_statements_) que podem conter várias linhas. Todas as informações do liberty são descritas usando três tipos de declarações: 
- **Declarações de grupo (_Group Statements_)** 
- **Declarações de atributo (_Attribute Statements_)** 
- **Declarações define (_Define Statements_)** 

<figure id="fig-statements"> 
  <div class="image-wrapper-colored"> 
    <img src="/assets/images/001_post/lib_sintax.png" class="responsive-img" alt="Declarações básicas do arquivo Liberty"> 
  </div> 
  <figcaption>Figura 4: Declarações básicas do arquivo Liberty.</figcaption> 
</figure>

## Grupo (_Group Statements_)
Um grupo é uma coleção de declarações que pode descrever uma biblioteca, uma célula, um pino, um arco de temporização, e assim por diante. Chaves ({}), são usadas em pares, delimitando o conteúdo do grupo. Além disso um grupo pode conter vários atributos e ainda outros grupos como seus elementos.

_**&nbsp;&nbsp;&nbsp;&nbsp;group_name (name) {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;... statements ...  
&nbsp;&nbsp;&nbsp;&nbsp;}**_

## Atributo (_Attribute Statements_)
Uma declaração de atributo determina uma característica específica de um objeto da biblioteca, como uma célula, um pino, etc. Os atributos são sempre colocados dentro de uma declaração de grupo. 
Os atributos ainda podem ser divididos, com base na sua sintaxe, em dois tipos: Atributos simples e atributos complexos.

- #### Atributo simples (_Simple Attributes_)
    Atributos simples possuem uma sintaxe básica, independente do valor. É necessário separar o nome do atributo do valor do atributo com um espaço, seguido por dois pontos e outro espaço. As declarações de atributo devem estar em uma única linha.
    
    _**&nbsp;&nbsp;&nbsp;&nbsp;attribute_name : attribute_value ;**_  


- #### Atributo complexo (_Complex Attributes_)
    Um atributo complexo inclui um ou mais parâmetros entre parênteses. A sintaxe da declaração de atributo complexo é: 

    _**&nbsp;&nbsp;&nbsp;&nbsp;attribute_name (parameter1, [parameter2, parameter3 ...] );**_  

## _Define_ (_Define Statements_)
Você pode ainda criar novos atributos simples personalizados com a declaração define.  

_**&nbsp;&nbsp;&nbsp;&nbsp;define (attribute_name, group_name, attribute_type) ;**_

Arquivos liberty grandes podem comprometer a capacidade do disco e os recursos de memória. Para reduzir o tamanho do arquivo Lib e melhorar o gerenciamento de arquivos, a sintaxe permite que você combine vários arquivos-fonte.  As referências são feitas no arquivo-fonte que contém a descrição do grupo da library. Durante a compilação da biblioteca, as informações referenciadas são recuperadas, incluídas no ponto de referência, e então a compilação continua. A sintaxe da declaração de include é: 

_**&nbsp;&nbsp;&nbsp;&nbsp;include_file (file_nameid) ;**_  

## Principais campos do Liberty 

### Grupo _library_ 
O grupo _library_ define a estrutura principal de um arquivo Liberty, abrangendo toda a descrição da biblioteca de células. É dentro desse grupo que todos os atributos e subgrupos são organizados. Além disso, é no nível da _library_ que se estabelecem os atributos globais que se aplicam a todas as células da biblioteca. Cada arquivo .lib deve conter apenas um único grupo _library_, e sua declaração precisa ser a primeira linha executável do arquivo. A [Figura 5](#fig-library) ilustra um exemplo de como esse grupo é declarado em um arquivo Liberty.


<figure id="fig-library">
  <div class="image-wrapper-colored"> 
    <img src="/assets/images/001_post/01.png" class="responsive-img" alt="Exemplo de definição de um grupo library no Liberty File"> 
  </div> 
  <figcaption>Figura 5: Exemplo de definição de um grupo <em>library</em> em um arquivo Liberty.</figcaption>
</figure>

### Templates

No arquivo Liberty , os _table templates_ servem como modelos que armazenam informações comuns reutilizadas por várias lookup tables. Cada template define os parâmetros de consulta e os pontos de interrupção (breakpoints) em cada eixo da tabela. Para que uma lookup table possa utilizar um template, é necessário que ele tenha um nome único. Esses _table templates_ são especialmente úteis para representar diferentes tipos de atrasos de temporização e podem conter até três variáveis: variable_1, variable_2 e variable_3. Essas variáveis indicam os parâmetros usados para indexar os dados da tabela ao longo dos seus eixos, como o tempo de transição de entrada de um pino restrito, o comprimento da rede de saída, a capacitância ou a carga de saída de um pino relacionado. Como mostrado na [Figura 6](#fig-templating), os table templates ajudam a organizar e reaproveitar dados de temporização de forma eficiente.


<figure id="fig-templating">
  <div class="image-wrapper-colored">
    <img src="/assets/images/001_post/02.png" class="responsive-img" alt="Exemplo de definição de table templates no Liberty File">
  </div>
  <figcaption>Figura 6: Exemplo de definição de <em>table templates</em>.</figcaption>
</figure>


Para representar a potência interna das células no arquivo Liberty, também é possível criar modelos reutilizáveis que armazenam informações comuns para várias _lookup tables_. Para isso, utiliza-se o grupo ***power_lut_template***, definido no nível da biblioteca (dentro do grupo _library_). Esse tipo de template especifica os parâmetros da tabela e os pontos de interrupção (breakpoints) em cada eixo, como exemplificado na [Figura 7](#fig-power-templating). Assim como nos _table templates_, é necessário dar um nome único a cada _power_lut_template_, para que ele possa ser referenciado por diferentes tabelas de potência ao longo do arquivo.

<figure id="fig-power-templating">
  <div class="image-wrapper-colored">
    <img src="/assets/images/001_post/03.png" class="responsive-img" alt="Exemplo de definição de power table templates no Liberty File">
  </div>
  <figcaption>Figura 7: Exemplo de definição de <em>power table template</em> .</figcaption>
</figure>


### Grupo _cell_ 
As descrições de células são uma parte fundamental de uma biblioteca de tecnologia. Elas fornecem informações sobre a área, função e temporização de cada componente em uma dada biblioteca padrão de células. O grupo _cell_ é responsável por conter os atributos e groupos que declaram essas informações. A [Figura 8](#fig-cell) mostra um exemplo da definição do grupo cell em um arquivo Liberty.


<figure id="fig-cell">
  <div class="image-wrapper-colored">
    <img src="/assets/images/001_post/04.png" class="responsive-img" alt="Exemplo de definição do grupo cell no Liberty File">
  </div>
  <figcaption>Figura 8: Exemplo de definição do grupo <em>cell</em> em um arquivo Liberty.</figcaption>
</figure>


### Grupo _pin_ 
Para cada pino em uma célula da biblioteca, um grupo _cell_ deve conter auma descrição das características de consumo e atraso do pino. As características do pino são definidas em um grupo _pin_ dentro do grupo _cell_. Um grupo _pin_ geralmente contém um grupo _timing_ e um grupo _internal_power_.

Para cada pino dentro de uma célula da biblioteca, o grupo _cell_ deve conter uma descrição detalhada das características desse pino. Essas características são definidas em um grupo _pin_, que pode ser declarado dentro de um grupo _cell_, test_cell, model ou bus. A [Figura 9](#fig-pin) mostra um exemplo da definição do grupo _pin_ em um arquivo Liberty, destacando seus principais campos.
Normalmente, o grupo _pin_ inclui subgrupos importantes como _timing_, que descreve os atrasos e temporizações associados ao pino, e _internal_power_, que detalha o consumo de potência interno relacionado ao pino.

<figure id="fig-pin">
  <div class="image-wrapper-colored">
    <img src="/assets/images/001_post/05.png" class="responsive-img" alt="Exemplo de definição do grupo pin no Liberty File">
  </div>
  <figcaption>Figura 9: Exemplo de definição do grupo <em>pin</em> e seus principais campos em um arquivo Liberty.</figcaption>
</figure>

### Entendendo os Timing Arcs
Os arcos de temporização (_timing arcs_), junto com as informações de interconexão do netlist, definem os caminhos que o analisador de temporização segue durante a verificação dos caminhos críticos no circuito.

Cada _timing arc_ tem um ponto de partida (startpoint) e um ponto de chegada (endpoint). O ponto de partida pode ser um pino de entrada, saída ou de entrada/saída (I/O). Já o ponto de chegada é sempre um pino de saída ou I/O, com exceção dos arcos de restrição (_constraint timing arc_), como os de _setup_ ou _hold_, que podem ocorrer entre dois pinos de entrada.

Todas as informações de atraso contidas em um arquivo Liberty estão associadas a pares de pinos, como entrada → saída ou saída → saída.

### Arcos de Temporização Combinacionais
Os arcos de temporização combinacionais descrevem o comportamento de atraso em elementos puramente lógicos, como portas AND, OR, inversores, etc.  
Esse tipo de arco é conectado a um pino de saída e o pino relacionado pode ser tanto um pino de entrada quanto outro pino de saída. Dependendo do tipo de transição e do comportamento envolvido o arco pode ser classificado em: combinational, combinational_rise, combinational_fall, three_state_disable, three_state_disable_rise entre outros.

Esses diferentes tipos permitem modelar o comportamento do circuito de forma mais detalhada, levando em conta as transições específicas de subida e descida, além do controle de estados tri.

### Arcos de Temporização Sequenciais
Os arcos sequenciais descrevem o comportamento temporal de elementos que possuem memória, como flip-flops e latches.
Nesses casos, quando um arco descreve a relação entre uma transição de clock e a saída de dados (entrada → saída), ele é tratado como um arco de atraso (delay arc). Quando descreve a relação entre o clock e a entrada de dados (entrada → entrada), é um arco de restrição (constraint arc).
Os principais tipos de arcos sequenciais são:

- Sensíveis à borda (rising_edge ou falling_edge)
- Controle assíncrono (preset, clear)
- Restrições de setup e hold (setup_rising, setup_falling, hold_rising, hold_falling)
- Setup e hold não sequenciais (non_seq_setup_rising, etc.)
- Recuperação e remoção (recovery_rising, removal_falling, etc.)
- Sem alteração esperada de valor (nochange_high_high, nochange_low_low, etc.)

Esses arcos são fundamentais para a análise de restrições de temporização e integridade dos dados em células sequenciais.

Considere uma célula combinacional simples composta por dois inversores em série (Figura 7-2). Essa célula pode ser modelada de duas formas distintas (Figura 7-3)

- **Modelo A**: Define dois timing arcs diretos, ambos com ponto de partida no pino de entrada A. Um arco vai de A para Y, e o outro de A para Z. É um modelo simples e direto.
- **Modelo B**: Também define dois arcos, mas de forma mais precisa. O primeiro arco é igual ao do Modelo A (de A para Y). O segundo, no entanto, começa no pino de saída Y e termina em Z. Isso permite modelar com mais fidelidade o impacto da carga conectada a Y no atraso observado em Z.

Esse tipo de arco de saída-para-saída (output-to-output arc) pode ser usado tanto em células combinacionais quanto em sequenciais, trazendo maior precisão à análise de temporização.

### Grupo _timing_ 

O grupo _timing_ contém informações para modelar arcos de temporização (timing arcs) e rastridentificar caminhos durante a STA. Ele define os arcos de temporização através de uma célula e as relações entre os sinais de clock e das entrada dados.

O grupo _timing_ descreve:

- Relações de temporização entre um pino de entrada e um pino de saída.
- Relações de temporização entre dois pinos de saída.
- Arcos de temporização através de um elemento não combinacional.
- Tempos de setup e hold em entradas de flip-flop ou latch.
- Opcionalmente, os nomes dos arcos de temporização.

O grupo _timing_ também descreve as informações de setup e hold quando as informações de restrição se referem a um par de pinos de entrada. A [Figura 10](#fig-timing) exemplifica a estrutura do grupo timing em um arquivo Liberty, mostrando os principais campos e como eles se organizam dentro do grupo pin.

<figure id="fig-timing">
  <div class="image-wrapper-colored">
    <img src="/assets/images/001_post/06.png" class="responsive-img" alt="Exemplo de definição do grupo timing no Liberty File">
  </div>
  <figcaption>Figura 10: Exemplo de definição do grupo <em>timing</em> e seus principais campos em um arquivo Liberty.</figcaption>
</figure>

Dentro do grupo _timing_, é possível identificar o nome ou os nomes de diferentes arcos de temporização. Um único arco pode ocorrer entre um pino identificado e um único pino relacionado, identificado com o atributo related_pin.
Múltiplos arcos de temporização podem ocorrer de várias maneiras. A lista a seguir mostra seis possíveis configurações de múltiplos arcos de temporização. As seções descritivas explicam como configurar outras possíveis variações:

- Entre um único pino relacionado e os múltiplos membros identificados de um bundle.
- Entre múltiplos pinos relacionados e os múltiplos membros identificados de um bundle.
- Entre um único pino relacionado e os múltiplos bits identificados de um barramento.
- Entre múltiplos pinos relacionados e os múltiplos bits identificados de um barramento.
- Entre os múltiplos bits identificados de um barramento e os múltiplos pinos de um barramento relacionado (com uma largura designada).
- Entre o pino interno e todos os bits do grupo de barramento de ponto final.  

A [Figura 11](#fig-multiarcs) ilustra essas diferentes configurações possíveis para múltiplos arcos de temporização dentro do grupo timing.

<figure id="fig-multiarcs"> 
  <div class="image-wrapper-colored"> 
    <img src="/assets/images/001_post/07.png" class="responsive-img" alt="Exemplo de múltiplos arcos de temporização no grupo timing do Liberty File"> 
  </div> 
  <figcaption>Figura 11: Exemplo das diversas configurações possíveis de múltiplos arcos de temporização dentro do grupo <em>timing</em>.</figcaption> 
</figure>


Agora que já exploramos os principais elementos que compõem a estrutura de um arquivo Liberty, podemos representar sua organização de forma mais clara por meio de uma hierarquia, como mostrado na [Figura 12](#fig-hierarchy). Essa representação visual ajuda a entender como as informações estão estruturadas dentro do arquivo .lib, facilitando a leitura e a navegação pelos diferentes blocos de dados, como células, pinos, arcos de temporização e parâmetros tecnológicos.


<figure id="fig-hierarchy">
  <div class="image-wrapper-clear">
    <img src="/assets/images/001_post/hierarchy.png" class="responsive-img-post-12" alt="Representação hierárquica do arquivo Liberty">
  </div>
  <figcaption>Figura 12: Representação hierárquica do arquivo <em>Liberty</em>.</figcaption>
</figure>


### Exemplo de cálculo de atraso usando Non-Linear Delay Model (NLDM)

Vamos supor que queremos calcular o atraso de propagação (tpd) de uma porta inversora (sg13g2_inv_1) em uma biblioteca caracterizada usando NLDM mostrada na [Figura 13](#fig-nldm-example). Para isso, precisamos de dois parâmetros de entrada:
- Transição da entrada (input net transition): 0.174 ns
- Capacitância de carga na saída (Cload): 0.039 pF

Esses dois valores serão usados como índices para acessar uma tabela de atraso (delay table) no arquivo .lib. As tabelas geralmente são 2D, com uma dimensão para a transição de entrada e outra para a carga de saída.

<figure id="fig-nldm-example">
  <div class="image-wrapper-clear">
    <img src="/assets/images/001_post/nldm_example.png" class="responsive-img-12" alt="Exemplo cálculo de atraso usando NLDM">
  </div>
  <figcaption>Figura 13: Exemplo de cálculo de atraso usando <em>NLDM</em>.</figcaption>
</figure>


Localizamos os índices na tabela:
- Input net transition = 0.174 ns → linha intermediária.
- Cload = 0.039 fF → coluna do meio.

O valor correspondente na tabela é **0.0156287 ns**, portando atraso de propagação (tpd) da porta para essa condição é 0.0156287 ns.

Quando os valores de entrada, como o input net transition e Cload, não correspondem exatamente aos pontos definidos nas tabelas do arquivo .lib, as ferramentas de EDA utilizam técnicas de interpolação. Esse processo permite estimar com certa precisão os valores intermediários de propagation delay com base nos dados tabelados mais próximos.


## Design Liberty 

Arquivos Liberty também podem ser gerados para blocos ou IPs digitais ou analógicos já sintetizados. Essa prática permite análises de Static Timing Analysis (STA)mais precisas em níveis superiores do projeto, como na integração de topo.
As informações incluídas nesses arquivos vão depender das restrições de temporização e requisitos específicos do bloco, sendo fundamentais para garantir que o comportamento do IP seja corretamente modelado durante a análise de temporização e durante as etapas de otimização do projeto final.

A [Figura 14](#fig-design-lib-example) mostra um exemplo de arquivo Liberty gerado para um bloco funcional (um contador), com suas principais informações estruturadas.

<figure id="fig-design-lib-example">
  <div class="image-wrapper-colored">
    <img src="/assets/images/001_post/08.png" class="responsive-img" alt="Exemplo cálculo de atraso usando NLDM">
  </div>
  <figcaption>Figura 14: Exemplo de um liberty para o design de um contador. <em>NLDM</em>.</figcaption>
</figure>



Normalmente, um IP analógico que possui restrições de temporização é caracterizado (memórias, células padrão, blocos digitais personalizados), e um arquivo .lib é gerado (com um script Perl ou por ferramenta de EDA). Se não houver restrições de temporização a serem respeitadas, as informações mínimas no arquivo .lib são a seção de pinos, sem as seções de temporização/potência.

Geralmente, um IP analógico sem restrições é entregue como LEF/Lib, e o .lib contém:

- Pinos de saída (obrigatório, alinhado com o módulo Verilog)

- Valores máximos de capacitância/transição/etc. (regras de design) (não obrigatório, mas ajuda na colocação/roteamento ou síntese para corrigir e/ou antecipar o valor de capacitância).

Você pode criar um .lib copiando e colando de um arquivo existente, e substituindo as seções de células/pinos, etc.



#### Referencias

<a href="https://www.ispd.cc/contests/18/lefdefref.pdf" class="link-offset-2 link-offset-3-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover !important">https://www.ispd.cc/contests/18/lefdefref.pdf</a>. Acessado em 24-Jul-2023

<a href="http://coriolis.lip6.fr/doc/lefdef/lefdefref/LEFSyntax.html." class="link-offset-2 link-offset-3-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover !important">http://coriolis.lip6.fr/doc/lefdef/lefdefref/LEFSyntax.html.</a>. Acessado em 24-Jul-2023
