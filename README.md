## optinames

Optinames are tradable and transferable sub-domains wrapped as ERC721s & fully integrated with the Ethereum Name Service (ENS).

When a name is looked up the resolver responsible is called to resolve the name. During this execution the OffchainLookup error is thrown, and the client will attempt to reach out to the gateway specified by the error. If successful the gateways results are returned to the callback function specified in the error. The output of the callback function is then returned to the client and considered the result of the original lookup.

