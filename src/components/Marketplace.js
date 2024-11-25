import React, { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import idl from '../idl.json'; // Ensure this matches your deployed program
import { FaLock } from 'react-icons/fa'; // Lock icon
import '../css/Marketplace.css';

const PROGRAM_ID = new PublicKey('4WpWUh3unfvEHRfmiRMDgRxcvMAaZ5hCn16KaVMDoy8x');
const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl('devnet'));

const Marketplace = () => {
  const [videos, setVideos] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [program, setProgram] = useState(null);

  useEffect(() => {
    // Check for Phantom wallet
    if (window.solana && window.solana.isPhantom) {
      setWallet(window.solana);
      if (window.solana.isConnected) {
        initializeWalletAndProgram();
      }
    } else {
      console.error('No wallet found! Please install Phantom wallet.');
    }
  }, []);

  useEffect(() => {
    // Refetch videos whenever the program is initialized
    if (program) {
      fetchVideos();
    }
  }, [program]);

  const initializeWalletAndProgram = async () => {
    try {
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

      setIsConnected(true);
      console.log('Wallet connected:', wallet.publicKey.toString());
    } catch (error) {
      console.error('Error initializing wallet and program:', error);
    }
  };

  const connectWallet = async () => {
    if (!wallet) {
      alert('Phantom wallet not found. Please install it and try again.');
      return;
    }
    try {
      await wallet.connect();
      initializeWalletAndProgram();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      console.log('Fetching video accounts...');
      const videoAccounts = await connection.getProgramAccounts(PROGRAM_ID);

      if (!videoAccounts.length) {
        console.log('No videos found on the blockchain.');
        setVideos([]);
        return;
      }

      const videosData = videoAccounts
        .map((account) => {
          try {
            const decoded = program.account.video.coder.accounts.decode('Video', account.account.data);
            return {
              publicKey: account.pubkey.toString(),
              name: decoded.name,
              price: (decoded.price.toNumber() / 1_000_000_000).toFixed(2), // Convert lamports to SOL
              description: decoded.description,
              uri: decoded.uri,
              creator: decoded.creator.toString(),
              isPaid: false,
            };
          } catch (decodeError) {
            console.error('Error decoding account data:', decodeError);
            return null;
          }
        })
        .filter((video) => video !== null);

      setVideos(videosData);
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
  };

  const payAndPlay = async (video) => {
    if (!program || !wallet || !wallet.publicKey) {
      alert('Wallet not connected or program not initialized.');
      return;
    }

    try {
      const tx = await program.rpc.payToPlay({
        accounts: {
          video: new PublicKey(video.publicKey),
          player: wallet.publicKey,
          creator: new PublicKey(video.creator),
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });

      console.log('Payment successful, transaction signature:', tx);
      alert(`Payment successful! You can now watch "${video.name}".`);

      setVideos(
        videos.map((v) =>
          v.publicKey === video.publicKey ? { ...v, isPaid: true } : v
        )
      );
    } catch (error) {
      console.error('Error paying for video:', error);
      alert('Payment failed. Please try again.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Video Marketplace</h1>
      {!isConnected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          {videos.length > 0 ? (
            videos.map((video, index) => (
              <div key={index} style={{ border: '1px solid #ddd', padding: '1rem', margin: '1rem 0' }}>
                <h2>{video.name}</h2>
                <p>{video.description}</p>
                <p>
                  Price: <strong>{video.price} SOL</strong>
                </p>
                {video.isPaid ? (
                  <video width="300" controls>
                    <source src={video.uri} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div>
                    <FaLock style={{ color: 'red' }} />
                    <p>This video is locked. Please pay to watch it.</p>
                    <button onClick={() => payAndPlay(video)}>Pay and Play</button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>No videos available. Check back later!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
