/**
 * =========================================
 * BSC CLIENT
 * =========================================
 * BSC blockchain client (fork of Ethereum)
 */

import { EventEmitter } from 'events';
import Web3 from 'web3';
import { ChainConfig, RPCProvider, ChainClient, TransactionData, BlockData, TransactionType } from '../../types';
import { Logger } from '../../utils/Logger';
import { EthereumClient } from './EthereumClient';

export class BSCClient extends EthereumClient {
  constructor(config: ChainConfig, providers: RPCProvider[]) {
    super(config, providers);
    const logger = new Logger('BSCClient');
    logger.info('🔗 BSC Client initialized (inherits from EthereumClient)');
  }
}
