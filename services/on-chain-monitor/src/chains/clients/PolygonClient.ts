/**
 * =========================================
 * POLYGON CLIENT
 * =========================================
 * Polygon blockchain client (fork of Ethereum)
 */

import { EventEmitter } from 'events';
import Web3 from 'web3';
import { ChainConfig, RPCProvider, ChainClient, TransactionData, BlockData, TransactionType } from '../../types';
import { Logger } from '../../utils/Logger';
import { EthereumClient } from './EthereumClient';

export class PolygonClient extends EthereumClient {
  constructor(config: ChainConfig, providers: RPCProvider[]) {
    super(config, providers);
    const logger = new Logger('PolygonClient');
    logger.info('🔗 Polygon Client initialized (inherits from EthereumClient)');
  }
}
