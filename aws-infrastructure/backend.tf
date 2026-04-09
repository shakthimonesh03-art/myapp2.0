terraform {
  backend "s3" {
    bucket = "state-files-bucket-ram"
    key    = "./terraform.tfstate"
    region = "ap-south-1"
  }
}
