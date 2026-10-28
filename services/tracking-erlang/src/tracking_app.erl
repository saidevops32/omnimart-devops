-module(tracking_app).
-behaviour(application).
-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    Dispatch = cowboy_router:compile([
        {'_', [
            {"/ws/tracking/[...]", tracking_ws_handler, []},
            {"/api/tracking/healthz", tracking_health_handler, []}
        ]}
    ]),
    {ok, _} = cowboy:start_clear(http_listener,
        [{port, 8090}],
        #{env => #{dispatch => Dispatch}}
    ),
    tracking_sup:start_link().

stop(_State) ->
    ok.
