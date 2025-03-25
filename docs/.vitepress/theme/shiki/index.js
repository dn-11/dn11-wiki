export const birdGrammar = {
  name: "bird",
  scopeName: "source.bird",
  displayName: "Bird Configuration",
  patterns: [
    {
      name: "comment.line.number-sign.bird",
      match: "#.*$",
    },
    {
      name: "string.quoted.double.bird",
      begin: '"',
      end: '"',
      patterns: [
        {
          match: '\\\\"',
          name: "constant.character.escape.bird",
        },
      ],
    },
    {
      name: "string.quoted.single.bird",
      begin: "'",
      end: "'",
      patterns: [
        {
          match: "\\\\'",
          name: "constant.character.escape.bird",
        },
      ],
    },
    {
      name: "constant.numeric.network-address.ip4.bird",
      match: "\\d+\\.\\d+\\.\\d+\\.\\d+(\\/\\d+)?",
    },
    {
      name: "constant.numeric.bird",
      match: "\\b\\d+(?=;|$)",
    },
    {
      name: "keyword.operator.bird",
      match: "(\\+|-|\\*|\\/|\\(|\\)|=|<|>|!|&&|\\|\\||~)",
    },
    {
      name: "meta.function.arguments.bird",
      begin: "\\(",
      end: "\\)",
    },
    {
      name: "keyword.control.bird",
      match: "\\b(define|table|eval)\\b",
    },
    {
      name: "keyword.other.bird",
      match: "\\b(router id|listen bgp)\\b",
    },
    {
      name: "keyword.control.directive.protocol.bird",
      match: "\\b(protocol|area|interface|networks|stubnet|neighbors)\\b",
    },
    {
      name: "keyword.control.directive.protocol.bird",
      match: "virtual link",
    },
    {
      name: "keyword.other.type.protocol.bird",
      match: "\\b(bgp|device|direct|kernel|ospf|pipe|rip|static|igp)\\b",
    },
    {
      name: "keyword.other.misc.protocol.bird",
      match:
        "\\b(as|via|self|self;|drop|drop;|ignore|ignore;|normal;|large;|broadcast;|nonbroadcast|nonbroadcast;|pointopoint;|none;|simple;|plain;|md5;|cryptographic;|eligible;|opaque;|transparent;|always;|never;|neighbor;|multicast;|reject;|prohibit)\\b",
    },
    {
      name: "keyword.other.global.protocol.bird",
      match:
        "\\b(preference|description|id|password|type|local|neighbor|multihop|passive|passive;|persist|persist;|learn|learn;|primary|rfc1583compat|rfc1583compat;|tick|hidden|hidden;|summary|summary;|cost|stub|stub;|hello|poll|retransmit|priority|wait|authentication|strict|honor|port|infinity|period|mode|route)\\b",
    },
    {
      name: "keyword.other.global.protocol.bird",
      match:
        "generate from|generate to|accept from|accept to|next hop|missing lladdr|source address|rr client|rr cluster id|rs client|enable route refresh|interpret communities|enable as4|capabilities|advertise ipv4|route limit|disable after error|(startup )?hold time|(scan|keepalive|timeout|garbage|connect retry|start delay|error (wait|forget)) time|path metric|prefer older|default bgp_med|default bgp_local_pref|device routes|(kernel|peer) table|stub cost|dead( count)?|rx buffer",
    },
    {
      name: "constant.numeric.date.protocol.bird",
      match: "\\d{2}-\\d{2}-\\d{4} \\d{2}:\\d{2}:\\d{2}",
    },
    {
      name: "keyword.other.disabled.protocol.bird",
      match: "\\bdisabled|disabled;\\b",
    },
    {
      name: "keyword.other.attribute.protocol.bird",
      match:
        "\\bbgp_path|bgp_local_pref|bgp_med|bgp_origin|bgp_next_hop|bgp_atomic_aggr|bgp_community|bgp_originator_id|bgp_cluster_list|ospf_metric1|ospf_metric2|ospf_tag|rip_metric|rip_tag\\b",
    },
    {
      name: "keyword.other.ipversion.bird",
      match: "\\b(ipv4|ipv6)\\b",
    },
    {
      name: "keyword.other.importexport.bird",
      match:
        "\\b(import|include|export|where|add|always|filename|dynamic|if|paths|template|from)\\b",
    },
    {
      name: "constant.language.rts-static.bird",
      match: "\\b(RTS_STATIC|RTS_BGP)\\b",
    },
    {
      name: "constant.language.const.bird",
      match: "\\b(all|none|accept|reject)\\b",
    },
    {
      name: "constant.character.percent-prefix.bird",
      match: "%(?=[a-zA-Z_][a-zA-Z0-9_]*)\\b[a-zA-Z_][a-zA-Z0-9_]*",
    },
  ],
};