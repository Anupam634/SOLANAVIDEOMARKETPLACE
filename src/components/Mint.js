import React, { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import axios from 'axios';
import idl from '../idl.json';
import { Buffer } from 'buffer';

const PINATA_API_KEY = 'b0568259042e8532ab9d';
const PINATA_SECRET_KEY = 'bb5b6f6e1486d3cf267225821e1a0f6b6047436f9bd90b7650a8515df743a189';
const PROGRAM_ID = new PublicKey('4WpWUh3unfvEHRfmiRMDgRxcvMAaZ5hCn16KaVMDoy8x');
const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl('devnet'));

const SOL_TO_LAMPORTS = 1_000_000_000; // Conversion factor

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

const Mint = () => {
  const [wallet, setWallet] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [program, setProgram] = useState(null);
  const [videoData, setVideoData] = useState({
    videoName: '',
    videoPrice: '',
    videoDescription: '',
    videoFile: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.solana && window.solana.isPhantom) {
      setWallet(window.solana);
    }
  }, []);

  const connectWallet = async () => {
    if (!wallet) {
      alert('Phantom wallet is not installed.');
      return;
    }

    try {
      await wallet.connect();
      setIsConnected(true);

      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        },
        anchor.AnchorProvider.defaultOptions()
      );

      anchor.setProvider(provider);

      const programInstance = new anchor.Program(idl, PROGRAM_ID, provider);
      setProgram(programInstance);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVideoData({ ...videoData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoData({ ...videoData, videoFile: file });
    }
  };

  const mintVideo = async () => {
    if (!program || !wallet || !wallet.publicKey) {
      alert('Wallet not connected or program not initialized.');
      return;
    }

    const { videoName, videoPrice, videoDescription, videoFile } = videoData;

    if (!videoName || !videoPrice || !videoDescription || !videoFile) {
      alert('All fields are required.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', videoFile);

      const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      });

      const videoUri = `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
      const videoAccount = anchor.web3.Keypair.generate();

      // Convert price from SOL to lamports
      const videoPriceLamports = Math.round(parseFloat(videoPrice) * SOL_TO_LAMPORTS);

      await program.rpc.mintVideo(
        videoName,
        parseFloat(videoPrice), // Pass price in SOL for display
        videoDescription,
        videoUri,
        {
          accounts: {
            video: videoAccount.publicKey,
            creator: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          },
          signers: [videoAccount],
        }
      );

      alert('Video minted successfully!');
    } catch (err) {
      console.error('Error minting video:', err);
      alert('Failed to mint video.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Mint Video</h1>
      {!isConnected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <input type="text" name="videoName" placeholder="Video Name" onChange={handleInputChange} />
          <input type="number" name="videoPrice" placeholder="Video Price (SOL)" onChange={handleInputChange} />
          <input type="text" name="videoDescription" placeholder="Video Description" onChange={handleInputChange} />
          <input type="file" accept="video/*" onChange={handleFileChange} />
          <button onClick={mintVideo} disabled={loading}>
            {loading ? 'Minting...' : 'Mint Video'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Mint;
