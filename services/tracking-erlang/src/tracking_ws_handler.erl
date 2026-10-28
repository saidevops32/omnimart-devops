-module(tracking_ws_handler).
-export([init/2, websocket_init/1, websocket_handle/2, websocket_info/2]).

init(Req, State) ->
    {cowboy_websocket, Req, State}.

websocket_init(State) ->
    erlang:send_after(1000, self(), send_gps),
    {ok, State}.

websocket_handle({text, Msg}, State) ->
    {reply, {text, <<"ACK: ", Msg/binary>>}, State};
websocket_handle(_Data, State) ->
    {ok, State}.

websocket_info(send_gps, State) ->
    Payload = <<"{\"riderId\":\"RIDER-HYD-99\",\"lat\":17.4435,\"lng\":78.3772,\"status\":\"OUT_FOR_DELIVERY\",\"eta\":\"8 mins\"}">>,
    erlang:send_after(3000, self(), send_gps),
    {reply, {text, Payload}, State};
websocket_info(_Info, State) ->
    {ok, State}.
