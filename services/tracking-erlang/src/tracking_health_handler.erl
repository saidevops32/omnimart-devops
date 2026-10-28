-module(tracking_health_handler).
-behavior(cowboy_handler).

-export([init/2]).

init(Req0, State) ->
    Req = cowboy_req:reply(200,
        #{<<"content-type">> => <<"application/json">>},
        <<"{\"status\":\"healthy\",\"service\":\"erlang-cowboy\"}">>,
        Req0),
    {ok, Req, State}.
