# Only HA and DR solutions in SQL SERVER [High Availability]
## Replication for HA
Publications, distributor, subscriptions

Publisher-Distributor Architecture:

1. Snapshot Publication: Send the snapshot of published data to subscribers at scheduled intervals.
2. The Transactional: Publisher streams transactions to subscribers after they receive an initial snapshot of the published data.
3. Peer-to-peer: Multi-master replication. The publisher streams txn to all the peers in topology. All the peers can read and write changes and changes are propagated to all the nodes. 
4. Merge Publication: update the published data independently after the subscribers receive an initial snapshot of the published data. Changes are merged periodically. Compact edition can only subscribe to merge. There should always be the publisher. Non-realtime.




## Log Shipping
