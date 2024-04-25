import { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import { ThirdwebStorage } from "@thirdweb-dev/storage";
import fs from 'fs';
import { Engine } from "@thirdweb-dev/engine";
import { NFT_COLLECTION_CONTRACT_ADDRESS } from "../../constants/constant";

export const config = {
    api: {
      bodyParser: false,
    },
  };


const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed, please use POST" });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Error parsing the file upload" });
    }

    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
    const address = Array.isArray(fields.address) ? fields.address[0] : fields.address;
    const imageFile = files.image ? files.image[0] : null;

    if (!name || !description || !imageFile || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const {
      TW_ENGINE_URL,
      TW_ACCESS_TOKEN,
      TW_BACKEND_WALLET,
      TW_SECRET_KEY
    } = process.env;

    if (!TW_ENGINE_URL || !TW_ACCESS_TOKEN || !TW_BACKEND_WALLET || !TW_SECRET_KEY) {
      return res.status(500).json({ error: "Missing environment variables" });
    }

    try {
      const storage = new ThirdwebStorage({ secretKey: TW_SECRET_KEY });

      const fileData = fs.readFileSync(imageFile.filepath);

      const uri = await storage.upload(fileData);

      console.log("Image uploaded to IPFS: " + uri);

      const nftMetadata = {
        name: name,
        image: uri,
        description: description,
      };

      const engine = new Engine({
        url: TW_ENGINE_URL,
        accessToken: TW_ACCESS_TOKEN,
      });


      const response = await engine.erc721.mintTo(
        "sepolia",
        NFT_COLLECTION_CONTRACT_ADDRESS,
        TW_BACKEND_WALLET,
        {
          receiver: address,
          metadata: nftMetadata,
        }
      );

      console.log("NFT minted: ", response);

      res.status(200).json({ message: "NFT minted successfully", response });

      fs.unlinkSync(imageFile.filepath);


    } catch(error: any){

      console.error("Error processing file: ", error);
      res.status(500).json({ error: error.message || "An error occurred during minting" });

    }

  });
};

export default handler;